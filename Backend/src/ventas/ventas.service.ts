import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { QueryVentasDto } from './dto/query-ventas.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { PaginatedResult } from '../common/dto/pagination.dto';

interface VentaVista {
  id_venta: number;
  id_sede: number;
  sede: string;
  id_empleado: number;
  vendedor: string;
  fecha_emision: Date;
  cliente: string | null;
  producto: string;
  sku: string;
  cantidad: number;
  precio_unitario_momento: number;
  importe: number;
  monto_descuento: number;
  total_venta: number;
  nro_boleta: string | null;
}

interface CountRow {
  total: string;
}

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepo: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private readonly detalleRepo: Repository<DetalleVenta>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateVentaDto, user: JwtPayload): Promise<Venta> {
    if ((dto.monto_descuento ?? 0) > 0 && !dto.justificacion_descuento) {
      throw new BadRequestException(
        'justificacion_descuento es obligatorio cuando monto_descuento > 0',
      );
    }

    for (const item of dto.items) {
      const expected = parseFloat(
        (item.precio_unitario_momento * item.cantidad).toFixed(2),
      );
      const actual = parseFloat(item.importe.toFixed(2));
      if (Math.abs(expected - actual) > 0.01) {
        throw new BadRequestException(
          `Importe inválido para id_item ${item.id_item}: esperado ${expected}, recibido ${actual}`,
        );
      }
    }

    let savedVenta!: Venta;
    try {
      await this.dataSource.transaction(async (manager) => {
        const venta = manager.create(Venta, {
          id_cliente: dto.id_cliente ?? null,
          id_empleado: user.sub,
          id_sede: user.id_sede,
          monto_descuento: dto.monto_descuento ?? 0,
          tipo_descuento: dto.tipo_descuento ?? null,
          justificacion_descuento: dto.justificacion_descuento ?? null,
        });
        savedVenta = await manager.save(Venta, venta);

        for (const item of dto.items) {
          const detalle = manager.create(DetalleVenta, {
            id_venta: savedVenta.id_venta,
            id_item: item.id_item,
            cantidad: item.cantidad,
            precio_unitario_momento: item.precio_unitario_momento,
            costo_unitario_momento: item.costo_unitario_momento,
            importe: item.importe,
          });
          await manager.save(DetalleVenta, detalle);
        }
      });
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message?.includes('Stock insuficiente')) {
        throw new ConflictException(error.message);
      }
      throw err;
    }

    return (await this.ventaRepo.findOne({
      where: { id_venta: savedVenta.id_venta },
      relations: { detalles: true },
    })) as Venta;
  }

  async findAll(
    user: JwtPayload,
    query: QueryVentasDto,
  ): Promise<PaginatedResult<VentaVista>> {
    let sql = `SELECT * FROM v_vendedor_ventas WHERE id_empleado = $1`;
    const params: (string | number)[] = [user.sub];
    let idx = 2;

    if (query.fecha_desde) {
      sql += ` AND fecha_emision >= $${idx++}`;
      params.push(query.fecha_desde);
    }
    if (query.fecha_hasta) {
      sql += ` AND fecha_emision <= $${idx++}`;
      params.push(`${query.fecha_hasta} 23:59:59`);
    }
    if (query.id_cliente !== undefined) {
      sql += ` AND id_venta IN (SELECT id_venta FROM Ventas WHERE id_cliente = $${idx++})`;
      params.push(query.id_cliente);
    }

    const countSql = `SELECT COUNT(DISTINCT id_venta) AS total FROM (${sql}) sub`;
    const countResult = await this.dataSource.query<CountRow[]>(
      countSql,
      params,
    );
    const total = parseInt(countResult[0].total, 10);

    sql += ` ORDER BY fecha_emision DESC OFFSET $${idx++} LIMIT $${idx++}`;
    params.push((query.page - 1) * query.limit, query.limit);

    const items = await this.dataSource.query<VentaVista[]>(sql, params);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: number, user: JwtPayload): Promise<VentaVista[]> {
    const rows = await this.dataSource.query<VentaVista[]>(
      `SELECT * FROM v_vendedor_ventas WHERE id_venta = $1 AND id_empleado = $2`,
      [id, user.sub],
    );
    if (!rows.length) throw new NotFoundException(`Venta ${id} no encontrada`);
    return rows;
  }
}
