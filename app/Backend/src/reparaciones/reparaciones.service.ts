import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Reparacion } from './entities/reparacion.entity';
import { ReparacionRepuesto } from './entities/reparacion-repuesto.entity';
import { CreateReparacionDto } from './dto/create-reparacion.dto';
import { UpdateEstadoReparacionDto } from './dto/update-estado-reparacion.dto';
import { AddRepuestoReparacionDto } from './dto/add-repuesto-reparacion.dto';
import { QueryReparacionesDto } from './dto/query-reparaciones.dto';
import {
  PagoReparacionResponseDto,
  ReparacionResponseDto,
  RepuestoUsadoResponseDto,
} from './dto/reparacion-response.dto';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type { JwtPayload } from '../common/types';
import {
  EstadoReparacionNotFoundException,
  ReparacionEntregadaException,
  ReparacionNotFoundException,
  RepuestoUsadoNotFoundException,
  StockInsuficienteException,
} from '../common/exceptions';

interface ReparacionRow {
  id_reparacion: number;
  fecha_ingreso: Date;
  id_cliente: number;
  cliente: string | null;
  id_tecnico: number;
  tecnico: string | null;
  id_sede: number;
  marca: string | null;
  modelo: string | null;
  imei: string | null;
  esta_encendido: boolean | null;
  checklist_estado: Record<string, unknown> | null;
  diagnostico_tecnico: string | null;
  id_estado: number;
  estado: string | null;
  es_final: boolean;
  fecha_estimada: string | null;
  fecha_terminado: Date | null;
  fecha_entrega_cliente: Date | null;
  monto_cotizado: string | null;
  monto_descuento: string;
  tipo_descuento: string | null;
  justificacion_descuento: string | null;
  created_at: Date;
  updated_at: Date | null;
}

interface RepuestoRow {
  id_repuesto_u: number;
  id_item: number;
  item_nombre: string | null;
  sku: string | null;
  cantidad: number;
  precio_cobrado: string;
  costo_unitario_momento: string;
}

interface CountRow {
  total: string;
}

interface PagoRow {
  id_pago: number;
  metodo_pago: string;
  monto: string;
  es_adelanto: boolean;
  fecha_pago: Date;
}

interface EstadoRow {
  id_estado: number;
  nombre: string;
  es_final: boolean;
}

// Servicio de reparaciones. Gestiona ingreso de equipos, estados, repuestos y pagos asociados.
@Injectable()
export class ReparacionesService {
  constructor(
    @InjectRepository(Reparacion)
    private readonly reparacionRepo: Repository<Reparacion>,
    @InjectRepository(ReparacionRepuesto)
    private readonly repuestoRepo: Repository<ReparacionRepuesto>,
    private readonly dataSource: DataSource,
  ) {}

  // HU-15: Registra ingreso de equipo. Técnico autenticado es el responsable. Estado inicial = pendiente.
  async create(
    dto: CreateReparacionDto,
    user: JwtPayload,
  ): Promise<ReparacionResponseDto> {
    const [estadoRow] = await this.dataSource.query<EstadoRow[]>(
      `SELECT id_estado, nombre, es_final FROM estados_reparacion ORDER BY orden ASC LIMIT 1`,
    );

    const reparacion = this.reparacionRepo.create({
      id_cliente: dto.id_cliente,
      id_tecnico: user.sub,
      id_sede: user.id_sede!,
      marca: dto.marca ?? null,
      modelo: dto.modelo ?? null,
      imei: dto.imei ?? null,
      esta_encendido: dto.esta_encendido ?? null,
      checklist_estado: dto.checklist_estado ?? null,
      diagnostico_tecnico: dto.diagnostico_tecnico ?? null,
      id_estado: estadoRow.id_estado,
      fecha_estimada: dto.fecha_estimada ?? null,
      monto_cotizado: dto.monto_cotizado ?? null,
      monto_descuento: dto.monto_descuento ?? 0,
      tipo_descuento: dto.tipo_descuento ?? null,
      justificacion_descuento: dto.justificacion_descuento ?? null,
    });

    const saved = await this.reparacionRepo.save(reparacion);
    return this.findOne(saved.id_reparacion, user);
  }

  // HU-18: Historial paginado filtrable por cliente, estado, fechas y marca.
  async findAll(
    user: JwtPayload,
    query: QueryReparacionesDto,
  ): Promise<PaginatedResult<ReparacionResponseDto>> {
    const conditions: string[] = [`r.id_sede = $1`];
    const params: (string | number | boolean)[] = [user.id_sede!];
    let idx = 2;

    if (query.id_cliente !== undefined) {
      conditions.push(`r.id_cliente = $${idx++}`);
      params.push(query.id_cliente);
    }
    if (query.id_estado !== undefined) {
      conditions.push(`r.id_estado = $${idx++}`);
      params.push(query.id_estado);
    }
    if (query.fecha_desde) {
      conditions.push(`r.fecha_ingreso >= $${idx++}`);
      params.push(query.fecha_desde);
    }
    if (query.fecha_hasta) {
      conditions.push(`r.fecha_ingreso <= $${idx++}`);
      params.push(`${query.fecha_hasta} 23:59:59`);
    }
    if (query.marca) {
      conditions.push(`r.marca ILIKE $${idx++}`);
      params.push(`%${query.marca}%`);
    }
    if (query.modelo) {
      conditions.push(`r.modelo ILIKE $${idx++}`);
      params.push(`%${query.modelo}%`);
    }
    if (query.imei) {
      conditions.push(`r.imei ILIKE $${idx++}`);
      params.push(`%${query.imei}%`);
    }

    const where = conditions.join(' AND ');

    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query<CountRow[]>(
        `SELECT COUNT(*) AS total FROM reparaciones r WHERE ${where}`,
        params,
      ),
      this.dataSource.query<ReparacionRow[]>(
        `SELECT
           r.id_reparacion, r.fecha_ingreso, r.id_cliente,
           c.nombre_completo AS cliente,
           r.id_tecnico,
           e.nombre_completo AS tecnico,
           r.id_sede, r.marca, r.modelo, r.imei,
           r.esta_encendido, r.checklist_estado, r.diagnostico_tecnico,
           r.id_estado, er.nombre AS estado, er.es_final,
           r.fecha_estimada, r.fecha_terminado, r.fecha_entrega_cliente,
           r.monto_cotizado, r.monto_descuento,
           r.tipo_descuento, r.justificacion_descuento,
           r.created_at, r.updated_at
         FROM reparaciones r
         LEFT JOIN clientes c ON c.id_cliente = r.id_cliente
         LEFT JOIN empleados e ON e.id_empleado = r.id_tecnico
         LEFT JOIN estados_reparacion er ON er.id_estado = r.id_estado
         WHERE ${where}
         ORDER BY r.fecha_ingreso DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, query.limit, (query.page - 1) * query.limit],
      ),
    ]);

    return {
      items: rows.map(this.toResponse),
      total: parseInt(total, 10),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(parseInt(total, 10) / query.limit),
    };
  }

  // HU-18: Detalle completo con repuestos usados, pagos, total pagado y saldo pendiente.
  async findOne(id: number, user: JwtPayload): Promise<ReparacionResponseDto> {
    const [[row], repuestos, pagos] = await Promise.all([
      this.dataSource.query<ReparacionRow[]>(
        `SELECT
           r.id_reparacion, r.fecha_ingreso, r.id_cliente,
           c.nombre_completo AS cliente,
           r.id_tecnico,
           e.nombre_completo AS tecnico,
           r.id_sede, r.marca, r.modelo, r.imei,
           r.esta_encendido, r.checklist_estado, r.diagnostico_tecnico,
           r.id_estado, er.nombre AS estado, er.es_final,
           r.fecha_estimada, r.fecha_terminado, r.fecha_entrega_cliente,
           r.monto_cotizado, r.monto_descuento,
           r.tipo_descuento, r.justificacion_descuento,
           r.created_at, r.updated_at
         FROM reparaciones r
         LEFT JOIN clientes c ON c.id_cliente = r.id_cliente
         LEFT JOIN empleados e ON e.id_empleado = r.id_tecnico
         LEFT JOIN estados_reparacion er ON er.id_estado = r.id_estado
         WHERE r.id_reparacion = $1 AND r.id_sede = $2`,
        [id, user.id_sede!],
      ),
      this.dataSource.query<RepuestoRow[]>(
        `SELECT
           rru.id_repuesto_u, rru.id_item, i.nombre AS item_nombre, i.sku,
           rru.cantidad, rru.precio_cobrado, rru.costo_unitario_momento
         FROM reparacion_repuestos_usados rru
         LEFT JOIN items i ON i.id_item = rru.id_item
         WHERE rru.id_reparacion = $1`,
        [id],
      ),
      this.dataSource.query<PagoRow[]>(
        `SELECT id_pago, metodo_pago, monto, es_adelanto, fecha_pago
         FROM pagos WHERE id_reparacion = $1 ORDER BY fecha_pago ASC`,
        [id],
      ),
    ]);

    if (!row) throw new ReparacionNotFoundException(id);

    const totalPagado = parseFloat(
      pagos.reduce((s, p) => s + parseFloat(String(p.monto)), 0).toFixed(2),
    );

    // Base para calcular saldo: monto_cotizado si existe, o suma de precio_cobrado de repuestos.
    const montoCotizado =
      row.monto_cotizado !== null
        ? parseFloat(String(row.monto_cotizado))
        : repuestos.reduce(
            (s, r) => s + parseFloat(String(r.precio_cobrado)) * r.cantidad,
            0,
          );
    const montoDesc = parseFloat(String(row.monto_descuento));
    let totalCobrar: number;
    if (row.tipo_descuento === 'porcentaje') {
      totalCobrar = montoCotizado * (1 - montoDesc / 100);
    } else if (row.tipo_descuento === 'monto_fijo') {
      totalCobrar = montoCotizado - montoDesc;
    } else {
      totalCobrar = montoCotizado;
    }
    const saldoPendiente = parseFloat(
      Math.max(0, totalCobrar - totalPagado).toFixed(2),
    );

    return {
      ...this.toResponse(row),
      repuestos: repuestos.map(this.toRepuestoResponse),
      pagos: pagos.map(this.toPagoResponse),
      total_pagado: totalPagado,
      saldo_pendiente: saldoPendiente,
    };
  }

  // HU-16: Cambia estado de reparación. Bloquea modificación si ya fue entregada.
  async updateEstado(
    id: number,
    dto: UpdateEstadoReparacionDto,
    user: JwtPayload,
  ): Promise<ReparacionResponseDto> {
    const reparacion = await this.assertAccess(id, user.id_sede!);

    if (reparacion.es_final && reparacion.estado === 'entregado') {
      throw new ReparacionEntregadaException(id);
    }

    const [estadoNuevo] = await this.dataSource.query<EstadoRow[]>(
      `SELECT id_estado, nombre, es_final FROM estados_reparacion WHERE id_estado = $1`,
      [dto.id_estado],
    );
    if (!estadoNuevo) throw new EstadoReparacionNotFoundException(dto.id_estado);

    const updates: Partial<Reparacion> = { id_estado: dto.id_estado };

    if (dto.diagnostico_tecnico !== undefined) {
      updates.diagnostico_tecnico = dto.diagnostico_tecnico;
    }
    if (dto.monto_cotizado !== undefined) {
      updates.monto_cotizado = dto.monto_cotizado;
    }
    if (dto.fecha_estimada !== undefined) {
      updates.fecha_estimada = dto.fecha_estimada;
    }
    // Estado final sin fecha_terminado → se registra automáticamente.
    if (estadoNuevo.es_final && !reparacion.raw.fecha_terminado) {
      updates.fecha_terminado = new Date();
    }
    // Estado "entregado" → fecha_entrega_cliente.
    if (estadoNuevo.nombre === 'entregado' && !reparacion.raw.fecha_entrega_cliente) {
      updates.fecha_entrega_cliente = new Date();
    }

    // Usamos query raw para evitar incompatibilidades de tipo con JSONB en reparacionRepo.update.
    const setClauses: string[] = ['id_estado = $2'];
    const params: (number | string | null | Date)[] = [id, dto.id_estado];
    let idx = 3;

    if (updates.diagnostico_tecnico !== undefined) {
      setClauses.push(`diagnostico_tecnico = $${idx++}`);
      params.push(updates.diagnostico_tecnico);
    }
    if (updates.monto_cotizado !== undefined) {
      setClauses.push(`monto_cotizado = $${idx++}`);
      params.push(updates.monto_cotizado);
    }
    if (updates.fecha_terminado !== undefined) {
      setClauses.push(`fecha_terminado = $${idx++}`);
      params.push(updates.fecha_terminado);
    }
    if (updates.fecha_entrega_cliente !== undefined) {
      setClauses.push(`fecha_entrega_cliente = $${idx++}`);
      params.push(updates.fecha_entrega_cliente);
    }
    if (updates.fecha_estimada !== undefined) {
      setClauses.push(`fecha_estimada = $${idx++}`);
      params.push(updates.fecha_estimada ?? null);
    }

    await this.dataSource.query(
      `UPDATE reparaciones SET ${setClauses.join(', ')} WHERE id_reparacion = $1`,
      params,
    );
    return this.findOne(id, user);
  }

  // HU-17: Agrega repuesto consumido desde inventario. Trigger descuenta stock automáticamente.
  async addRepuesto(
    id: number,
    dto: AddRepuestoReparacionDto,
    user: JwtPayload,
  ): Promise<RepuestoUsadoResponseDto> {
    await this.assertAccess(id, user.id_sede!);

    const repuesto = this.repuestoRepo.create({
      id_reparacion: id,
      id_item: dto.id_item,
      cantidad: dto.cantidad,
      precio_cobrado: dto.precio_cobrado,
      costo_unitario_momento: dto.costo_unitario_momento,
    });

    try {
      const saved = await this.repuestoRepo.save(repuesto);

      const [row] = await this.dataSource.query<RepuestoRow[]>(
        `SELECT rru.id_repuesto_u, rru.id_item, i.nombre AS item_nombre, i.sku,
                rru.cantidad, rru.precio_cobrado, rru.costo_unitario_momento
         FROM reparacion_repuestos_usados rru
         LEFT JOIN items i ON i.id_item = rru.id_item
         WHERE rru.id_repuesto_u = $1`,
        [saved.id_repuesto_u],
      );

      return this.toRepuestoResponse(row);
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      if (e.message?.includes('Stock insuficiente') || e.code === '23514') {
        throw new StockInsuficienteException(
          e.message ?? 'Stock insuficiente para el repuesto solicitado',
        );
      }
      throw err;
    }
  }

  // HU-17: Elimina repuesto. Trigger devuelve stock al inventario.
  async removeRepuesto(
    reparacionId: number,
    repuestoId: number,
    user: JwtPayload,
  ): Promise<void> {
    await this.assertAccess(reparacionId, user.id_sede!);

    const repuesto = await this.repuestoRepo.findOne({
      where: { id_repuesto_u: repuestoId, id_reparacion: reparacionId },
    });
    if (!repuesto) throw new RepuestoUsadoNotFoundException(reparacionId, repuestoId);

    await this.repuestoRepo.remove(repuesto);
  }

  // Verifica que la reparación existe en la sede del técnico. Devuelve fila con estado para lógica interna.
  private async assertAccess(
    id: number,
    idSede: number,
  ): Promise<{ raw: ReparacionRow; es_final: boolean; estado: string }> {
    const [row] = await this.dataSource.query<ReparacionRow[]>(
      `SELECT r.*, er.es_final, er.nombre AS estado
       FROM reparaciones r
       LEFT JOIN estados_reparacion er ON er.id_estado = r.id_estado
       WHERE r.id_reparacion = $1 AND r.id_sede = $2`,
      [id, idSede],
    );
    if (!row) throw new ReparacionNotFoundException(id);
    return { raw: row, es_final: row.es_final, estado: row.estado ?? '' };
  }

  private toResponse(row: ReparacionRow): ReparacionResponseDto {
    return {
      id_reparacion: row.id_reparacion,
      fecha_ingreso: row.fecha_ingreso,
      id_cliente: row.id_cliente,
      cliente: row.cliente ?? null,
      id_tecnico: row.id_tecnico,
      tecnico: row.tecnico ?? null,
      id_sede: row.id_sede,
      marca: row.marca ?? null,
      modelo: row.modelo ?? null,
      imei: row.imei ?? null,
      esta_encendido: row.esta_encendido ?? null,
      checklist_estado: row.checklist_estado ?? null,
      diagnostico_tecnico: row.diagnostico_tecnico ?? null,
      id_estado: row.id_estado,
      estado: row.estado ?? null,
      fecha_estimada: row.fecha_estimada ?? null,
      fecha_terminado: row.fecha_terminado ?? null,
      fecha_entrega_cliente: row.fecha_entrega_cliente ?? null,
      monto_cotizado: row.monto_cotizado !== null ? parseFloat(String(row.monto_cotizado)) : null,
      monto_descuento: parseFloat(String(row.monto_descuento)),
      tipo_descuento: row.tipo_descuento ?? null,
      justificacion_descuento: row.justificacion_descuento ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at ?? null,
    };
  }

  private toRepuestoResponse(row: RepuestoRow): RepuestoUsadoResponseDto {
    return {
      id_repuesto_u: row.id_repuesto_u,
      id_item: row.id_item,
      item_nombre: row.item_nombre ?? null,
      sku: row.sku ?? null,
      cantidad: row.cantidad,
      precio_cobrado: parseFloat(String(row.precio_cobrado)),
      costo_unitario_momento: parseFloat(String(row.costo_unitario_momento)),
    };
  }

  private toPagoResponse(row: PagoRow): PagoReparacionResponseDto {
    return {
      id_pago: row.id_pago,
      metodo_pago: row.metodo_pago,
      monto: parseFloat(String(row.monto)),
      es_adelanto: row.es_adelanto,
      fecha_pago: row.fecha_pago,
    };
  }
}
