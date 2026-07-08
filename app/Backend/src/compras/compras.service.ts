import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CompraRefill } from './entities/compra-refill.entity';
import { DetalleCompraRefill } from './entities/detalle-compra-refill.entity';
import { CreateCompraDto } from './dto/create-compra.dto';
import { AddItemCompraDto } from './dto/add-item-compra.dto';
import { UpdateItemCompraDto } from './dto/update-item-compra.dto';
import {
  CompraResponseDto,
  DetalleCompraResponseDto,
} from './dto/compra-response.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { ComprasQueryDto } from './dto/compras-query.dto';
import type { JwtPayload } from '../common/types';
import {
  CompraNotFoundException,
  DeadlockException,
  DetalleCompraNotFoundException,
  SedeDeshabilitadaException,
  StockInsuficienteCompraException,
} from '../common/exceptions';

// Forma de la fila devuelta por la vista v_compra_cabecera.
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

// Forma de la fila de detalle cuando se une detalle_compra_refill con items.
interface DetalleRow {
  id_detalle: number;
  id_item: number;
  item_nombre: string | null;
  sku: string | null;
  cantidad_comprada: number;
  costo_unidad: string;
  precio_venta_sugerido: string;
}

// Servicio de negocio para órdenes de compra; interactúa directamente con la BD via SQL y ORM.
@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(CompraRefill)
    private readonly compraRepo: Repository<CompraRefill>,
    @InjectRepository(DetalleCompraRefill)
    private readonly detalleRepo: Repository<DetalleCompraRefill>,
    private readonly dataSource: DataSource,
  ) {}

  // Crea la cabecera de una compra y devuelve la representación completa desde la vista.
  async create(
    dto: CreateCompraDto,
    user: JwtPayload,
  ): Promise<CompraResponseDto> {
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
      // Un trigger de BD lanza un error si la sede está deshabilitada.
      if (e.message?.includes('deshabilitada')) {
        throw new SedeDeshabilitadaException(e.message);
      }
      throw err;
    }
  }

  // Listado paginado de compras de la sede; el conteo y los datos se obtienen en paralelo.
  async findAll(
    user: JwtPayload,
    query: ComprasQueryDto,
  ): Promise<PaginatedResult<CompraResponseDto>> {
    const proveedorFilter = query.proveedor ?? null;
    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query<[{ total: string }]>(
        `SELECT COUNT(*) AS total FROM v_compra_cabecera
         WHERE id_sede_destino = $1
           AND ($2::text IS NULL OR proveedor ILIKE '%' || $2 || '%')`,
        [user.id_sede!, proveedorFilter],
      ),
      this.dataSource.query<CompraRow[]>(
        `SELECT * FROM v_compra_cabecera
         WHERE id_sede_destino = $1
           AND ($2::text IS NULL OR proveedor ILIKE '%' || $2 || '%')
         ORDER BY fecha_compra DESC
         LIMIT $3 OFFSET $4`,
        [
          user.id_sede!,
          proveedorFilter,
          query.limit,
          (query.page - 1) * query.limit,
        ],
      ),
    ]);

    return {
      items: rows.map((row) => this.toCompraResponse(row)),
      total: parseInt(total, 10),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(parseInt(total, 10) / query.limit),
    };
  }

  // Devuelve cabecera + detalles de una compra; verifica que pertenezca a la sede del usuario.
  async findOne(id: number, idSede: number): Promise<CompraResponseDto> {
    const [[compra], detalles] = await Promise.all([
      this.dataSource.query<CompraRow[]>(
        `SELECT * FROM v_compra_cabecera WHERE id_compra = $1 AND id_sede_destino = $2`,
        [id, idSede],
      ),
      this.dataSource.query<DetalleRow[]>(
        `SELECT d.id_detalle, d.id_item, i.nombre AS item_nombre, i.sku,
                d.cantidad_comprada, d.costo_unidad, d.precio_venta_sugerido
         FROM detalle_compra_refill d
         JOIN items i ON i.id_item = d.id_item
         WHERE d.id_compra = $1`,
        [id],
      ),
    ]);

    if (!compra) throw new CompraNotFoundException(id);
    return {
      ...this.toCompraResponse(compra),
      detalles: detalles.map((detalle) => this.toDetalleResponse(detalle)),
    };
  }

  // Inserta un detalle; el trigger de stock puede lanzar errores que captura handleDetalleError.
  async addItem(
    compraId: number,
    dto: AddItemCompraDto,
    user: JwtPayload,
  ): Promise<void> {
    await this.ensureAccess(compraId, user.id_sede!);
    const detalle = this.detalleRepo.create({ id_compra: compraId, ...dto });
    try {
      await this.detalleRepo.save(detalle);
    } catch (err: unknown) {
      this.handleDetalleError(err);
    }
  }

  // Actualiza cantidad y precios opcionales de un ítem; el trigger ajusta el delta de stock.
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

    // Spread condicional para no sobreescribir precios que no vienen en el DTO.
    Object.assign(detalle, {
      cantidad_comprada: dto.cantidad_comprada,
      ...(dto.costo_unidad !== undefined && { costo_unidad: dto.costo_unidad }),
      ...(dto.precio_venta_sugerido !== undefined && {
        precio_venta_sugerido: dto.precio_venta_sugerido,
      }),
    });

    try {
      await this.detalleRepo.save(detalle);
    } catch (err: unknown) {
      this.handleDetalleError(err);
    }
  }

  // Elimina un ítem; el trigger revierte el stock sumando las unidades de vuelta.
  async removeItem(
    compraId: number,
    itemId: number,
    user: JwtPayload,
  ): Promise<void> {
    await this.ensureAccess(compraId, user.id_sede!);
    const detalle = await this.detalleRepo.findOne({
      where: { id_compra: compraId, id_item: itemId },
    });
    if (!detalle) throw new DetalleCompraNotFoundException(compraId, itemId);

    try {
      await this.detalleRepo.remove(detalle);
    } catch (err: unknown) {
      this.handleDetalleError(err);
    }
  }

  // Traduce errores de BD conocidos (deadlock, stock) a excepciones de dominio.
  private handleDetalleError(err: unknown): never {
    const e = err as { code?: string; message?: string };
    if (e.code === '40P01') throw new DeadlockException();
    if (e.message?.includes('insuficiente') || e.code === '23514') {
      throw new StockInsuficienteCompraException(
        e.message ?? 'Stock insuficiente para esta operación',
      );
    }
    throw err;
  }

  // Garantiza que la compra existe y pertenece a la sede; evita acceso cruzado entre sedes.
  private async ensureAccess(compraId: number, idSede: number): Promise<void> {
    const rows = await this.dataSource.query<{ id_compra: number }[]>(
      `SELECT id_compra FROM compras_refill WHERE id_compra = $1 AND id_sede_destino = $2`,
      [compraId, idSede],
    );
    if (!rows.length) throw new CompraNotFoundException(compraId);
  }

  // Mapea la fila cruda de la vista a la forma del DTO de respuesta de cabecera.
  private toCompraResponse(row: CompraRow): CompraResponseDto {
    return {
      id_compra: row.id_compra,
      id_empleado_refiller: row.id_empleado_refiller,
      empleado: row.empleado ?? null,
      id_sede_destino: row.id_sede_destino,
      id_proveedor: row.id_proveedor,
      proveedor: row.proveedor ?? null,
      fecha_compra: row.fecha_compra,
      // La BD devuelve decimales como string; se convierte a number para el DTO.
      costo_total: parseFloat(String(row.costo_total)),
    };
  }

  // Mapea la fila cruda de detalle a su DTO, convirtiendo decimales string a number.
  private toDetalleResponse(row: DetalleRow): DetalleCompraResponseDto {
    return {
      id_detalle_compra: row.id_detalle,
      id_item: row.id_item,
      item_nombre: row.item_nombre ?? null,
      sku: row.sku ?? null,
      cantidad_comprada: row.cantidad_comprada,
      costo_unidad: parseFloat(String(row.costo_unidad)),
      precio_venta_sugerido: parseFloat(String(row.precio_venta_sugerido)),
    };
  }
}
