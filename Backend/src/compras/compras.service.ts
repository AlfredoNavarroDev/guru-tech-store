import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CompraRefill } from './entities/compra-refill.entity';
import { DetalleCompraRefill } from './entities/detalle-compra-refill.entity';
import { CreateCompraDto } from './dto/create-compra.dto';
import { AddItemCompraDto } from './dto/add-item-compra.dto';
import { UpdateItemCompraDto } from './dto/update-item-compra.dto';
import { CompraResponseDto, DetalleCompraResponseDto } from './dto/compra-response.dto';
import { PaginatedResult, PaginationDto } from '../common/dto/pagination.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CompraNotFoundException,
  DetalleCompraNotFoundException,
  SedeDeshabilitadaException,
  StockInsuficienteCompraException,
} from '../common/exceptions';

interface CompraRow {
  id_compra: number;
  id_empleado_refiller: number;
  empleado: string | null;
  id_sede_destino: number;
  id_proveedor: number;
  proveedor: string | null;
  fecha_compra: Date;
  costo_total: string;
}

interface DetalleRow {
  id_detalle_compra: number;
  id_item: number;
  item_nombre: string | null;
  sku: string | null;
  cantidad_comprada: number;
  costo_unidad: string;
  precio_venta_sugerido: string;
}

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(CompraRefill)
    private readonly compraRepo: Repository<CompraRefill>,
    @InjectRepository(DetalleCompraRefill)
    private readonly detalleRepo: Repository<DetalleCompraRefill>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCompraDto, user: JwtPayload): Promise<CompraResponseDto> {
    const compra = this.compraRepo.create({
      id_empleado_refiller: user.sub,
      id_sede_destino: user.id_sede!,
      id_proveedor: dto.id_proveedor,
    });
    try {
      const saved = await this.compraRepo.save(compra);
      return this.findOne(saved.id_compra, user.id_sede!);
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (e.message?.includes('deshabilitada')) {
        throw new SedeDeshabilitadaException(e.message);
      }
      throw err;
    }
  }

  async findAll(user: JwtPayload, query: PaginationDto): Promise<PaginatedResult<CompraResponseDto>> {
    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query<[{ total: string }]>(
        `SELECT COUNT(*) AS total FROM compras_refill WHERE id_sede_destino = $1`,
        [user.id_sede!],
      ),
      this.dataSource.query<CompraRow[]>(
        `SELECT c.id_compra, c.id_empleado_refiller, e.nombre_completo AS empleado,
                c.id_sede_destino, c.id_proveedor, p.razon_social AS proveedor,
                c.fecha_compra,
                COALESCE(SUM(d.cantidad_comprada * d.costo_unidad), 0) AS costo_total
         FROM compras_refill c
         JOIN empleados e ON e.id_empleado = c.id_empleado_refiller
         JOIN proveedores p ON p.id_proveedor = c.id_proveedor
         LEFT JOIN detalle_compra_refill d ON d.id_compra = c.id_compra
         WHERE c.id_sede_destino = $1
         GROUP BY c.id_compra, e.nombre_completo, p.razon_social
         ORDER BY c.fecha_compra DESC
         LIMIT $2 OFFSET $3`,
        [user.id_sede!, query.limit, (query.page - 1) * query.limit],
      ),
    ]);

    return {
      items: rows.map(this.toCompraResponse),
      total: parseInt(total, 10),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(parseInt(total, 10) / query.limit),
    };
  }

  async findOne(id: number, idSede: number): Promise<CompraResponseDto> {
    const [[compra], detalles] = await Promise.all([
      this.dataSource.query<CompraRow[]>(
        `SELECT c.id_compra, c.id_empleado_refiller, e.nombre_completo AS empleado,
                c.id_sede_destino, c.id_proveedor, p.razon_social AS proveedor,
                c.fecha_compra,
                COALESCE(SUM(d.cantidad_comprada * d.costo_unidad), 0) AS costo_total
         FROM compras_refill c
         JOIN empleados e ON e.id_empleado = c.id_empleado_refiller
         JOIN proveedores p ON p.id_proveedor = c.id_proveedor
         LEFT JOIN detalle_compra_refill d ON d.id_compra = c.id_compra
         WHERE c.id_compra = $1 AND c.id_sede_destino = $2
         GROUP BY c.id_compra, e.nombre_completo, p.razon_social`,
        [id, idSede],
      ),
      this.dataSource.query<DetalleRow[]>(
        `SELECT d.id_detalle_compra, d.id_item, i.nombre AS item_nombre, i.sku,
                d.cantidad_comprada, d.costo_unidad, d.precio_venta_sugerido
         FROM detalle_compra_refill d
         JOIN items i ON i.id_item = d.id_item
         WHERE d.id_compra = $1`,
        [id],
      ),
    ]);

    if (!compra) throw new CompraNotFoundException(id);
    return { ...this.toCompraResponse(compra), detalles: detalles.map(this.toDetalleResponse) };
  }

  async addItem(compraId: number, dto: AddItemCompraDto, user: JwtPayload): Promise<void> {
    await this.ensureAccess(compraId, user.id_sede!);
    const detalle = this.detalleRepo.create({ id_compra: compraId, ...dto });
    await this.detalleRepo.save(detalle);
  }

  async updateItem(
    compraId: number,
    itemId: number,
    dto: UpdateItemCompraDto,
    user: JwtPayload,
  ): Promise<void> {
    await this.ensureAccess(compraId, user.id_sede!);
    const detalle = await this.detalleRepo.findOne({
      where: { id_compra: compraId, id_item: itemId },
    });
    if (!detalle) throw new DetalleCompraNotFoundException(compraId, itemId);

    Object.assign(detalle, {
      cantidad_comprada: dto.cantidad_comprada,
      ...(dto.costo_unidad !== undefined && { costo_unidad: dto.costo_unidad }),
      ...(dto.precio_venta_sugerido !== undefined && { precio_venta_sugerido: dto.precio_venta_sugerido }),
    });

    try {
      await this.detalleRepo.save(detalle);
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (e.message?.includes('insuficiente')) {
        throw new StockInsuficienteCompraException(e.message);
      }
      throw err;
    }
  }

  async removeItem(compraId: number, itemId: number, user: JwtPayload): Promise<void> {
    await this.ensureAccess(compraId, user.id_sede!);
    const detalle = await this.detalleRepo.findOne({
      where: { id_compra: compraId, id_item: itemId },
    });
    if (!detalle) throw new DetalleCompraNotFoundException(compraId, itemId);

    try {
      await this.detalleRepo.remove(detalle);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === '23514' || e.message?.includes('insuficiente')) {
        throw new StockInsuficienteCompraException(
          'No se puede revertir: el stock actual no cubre la cantidad a descontar',
        );
      }
      throw err;
    }
  }

  private async ensureAccess(compraId: number, idSede: number): Promise<void> {
    const rows = await this.dataSource.query<{ id_compra: number }[]>(
      `SELECT id_compra FROM compras_refill WHERE id_compra = $1 AND id_sede_destino = $2`,
      [compraId, idSede],
    );
    if (!rows.length) throw new CompraNotFoundException(compraId);
  }

  private toCompraResponse(row: CompraRow): CompraResponseDto {
    return {
      id_compra: row.id_compra,
      id_empleado_refiller: row.id_empleado_refiller,
      empleado: row.empleado ?? null,
      id_sede_destino: row.id_sede_destino,
      id_proveedor: row.id_proveedor,
      proveedor: row.proveedor ?? null,
      fecha_compra: row.fecha_compra,
      costo_total: parseFloat(String(row.costo_total)),
    };
  }

  private toDetalleResponse(row: DetalleRow): DetalleCompraResponseDto {
    return {
      id_detalle_compra: row.id_detalle_compra,
      id_item: row.id_item,
      item_nombre: row.item_nombre ?? null,
      sku: row.sku ?? null,
      cantidad_comprada: row.cantidad_comprada,
      costo_unidad: parseFloat(String(row.costo_unidad)),
      precio_venta_sugerido: parseFloat(String(row.precio_venta_sugerido)),
    };
  }
}
