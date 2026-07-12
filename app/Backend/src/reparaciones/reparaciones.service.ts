import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DataSource, Repository } from 'typeorm';
import { Reparacion } from './entities/reparacion.entity';
import { ReparacionRepuesto } from './entities/reparacion-repuesto.entity';
import { CreateReparacionDto } from './dto/create-reparacion.dto';
import { UpdateEstadoReparacionDto } from './dto/update-estado-reparacion.dto';
import { AddRepuestoReparacionDto } from './dto/add-repuesto-reparacion.dto';
import { UploadFotoReparacionDto } from './dto/upload-foto-reparacion.dto';
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
  EstadoSaltoInvalidoException,
  ReparacionEntregadaException,
  ReparacionNotFoundException,
  RepuestoUsadoNotFoundException,
  StockInsuficienteException,
} from '../common/exceptions';

// Forma cruda de cada fila devuelta por la vista v_reparacion_lista.
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
  tipo_servicio: 'software' | 'hardware' | 'mixto' | null;
  tipo_accion: 'diagnostico' | 'reparacion';
  repuestos_cost?: string;
  created_at: Date;
  updated_at: Date | null;
  fotos: { url: string; etapa: string; created_at: string }[] | null;
  id_garantia_reclamada: number | null;
}

// Forma cruda de cada repuesto consumido, unida con la tabla items.
interface RepuestoRow {
  id_repuesto_u: number;
  id_item: number;
  item_nombre: string | null;
  sku: string | null;
  cantidad: number;
  precio_cobrado: string;
  costo_unitario_momento: string;
}

// Resultado del COUNT(*) usado para la paginación; total viene como string en pg.
interface CountRow {
  total: string;
}

// Forma cruda de cada pago registrado para una reparación.
interface PagoRow {
  id_pago: number;
  metodo_pago: string;
  monto: string;
  es_adelanto: boolean;
  fecha_pago: Date;
}

// Fila de estados_reparacion; `orden` controla la secuencia permitida de transiciones.
interface EstadoRow {
  id_estado: number;
  nombre: string;
  es_final: boolean;
  orden: number;
}

// Servicio de reparaciones. Gestiona ingreso de equipos, estados, repuestos y pagos asociados.
@Injectable()
export class ReparacionesService {
  private readonly s3: S3Client;

  constructor(
    @InjectRepository(Reparacion)
    private readonly reparacionRepo: Repository<Reparacion>,
    @InjectRepository(ReparacionRepuesto)
    private readonly repuestoRepo: Repository<ReparacionRepuesto>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    // Inicializa el cliente S3 compatible con Cloudflare R2 usando el endpoint de cuenta.
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.get<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

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
      tipo_servicio: dto.tipo_servicio ?? null,
      tipo_accion: dto.tipo_accion,
    });

    const saved = await this.reparacionRepo.save(reparacion);
    return this.findOne(saved.id_reparacion, user);
  }

  // HU-18: Historial paginado filtrable por cliente, estado, fechas y marca.
  async findAll(
    user: JwtPayload,
    query: QueryReparacionesDto,
  ): Promise<PaginatedResult<ReparacionResponseDto>> {
    const conditions: string[] = [`id_sede = $1`];
    const params: (string | number | boolean)[] = [user.id_sede!];
    let idx = 2;

    if (query.id_cliente !== undefined) {
      conditions.push(`id_cliente = $${idx++}`);
      params.push(query.id_cliente);
    }
    if (query.id_estado !== undefined) {
      conditions.push(`id_estado = $${idx++}`);
      params.push(query.id_estado);
    }
    if (query.fecha_desde) {
      conditions.push(`fecha_ingreso >= $${idx++}`);
      params.push(query.fecha_desde);
    }
    if (query.fecha_hasta) {
      conditions.push(`fecha_ingreso <= $${idx++}`);
      params.push(`${query.fecha_hasta} 23:59:59`);
    }
    if (query.marca) {
      conditions.push(`marca ILIKE $${idx++}`);
      params.push(`%${query.marca}%`);
    }
    if (query.modelo) {
      conditions.push(`modelo ILIKE $${idx++}`);
      params.push(`%${query.modelo}%`);
    }
    if (query.imei) {
      conditions.push(`imei ILIKE $${idx++}`);
      params.push(`%${query.imei}%`);
    }

    const where = conditions.join(' AND ');

    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query<CountRow[]>(
        `SELECT COUNT(*) AS total FROM v_reparacion_lista WHERE ${where}`,
        params,
      ),
      this.dataSource.query<ReparacionRow[]>(
        `SELECT * FROM v_reparacion_lista
         WHERE ${where}
         ORDER BY fecha_ingreso DESC
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
        `SELECT * FROM v_reparacion_lista WHERE id_reparacion = $1 AND id_sede = $2`,
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

    // Base para calcular saldo: monto_cotizado (mano de obra) + suma de precio_cobrado de repuestos.
    const repuestosCost = repuestos.reduce(
      (s, r) => s + parseFloat(String(r.precio_cobrado)) * r.cantidad,
      0,
    );
    const montoCotizado =
      (row.monto_cotizado !== null
        ? parseFloat(String(row.monto_cotizado))
        : 0) + repuestosCost;
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
      monto_total: parseFloat(totalCobrar.toFixed(2)),
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
      `SELECT id_estado, nombre, es_final, orden FROM estados_reparacion WHERE id_estado = $1`,
      [dto.id_estado],
    );
    if (!estadoNuevo)
      throw new EstadoReparacionNotFoundException(dto.id_estado);

    const [estadoActual] = await this.dataSource.query<{ orden: number }[]>(
      `SELECT orden FROM estados_reparacion WHERE id_estado = $1`,
      [reparacion.raw.id_estado],
    );

    if (estadoActual && estadoNuevo.orden > estadoActual.orden + 1) {
      throw new EstadoSaltoInvalidoException(
        reparacion.estado ?? 'desconocido',
        estadoNuevo.nombre,
      );
    }

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
    if (
      estadoNuevo.nombre === 'entregado' &&
      !reparacion.raw.fecha_entrega_cliente
    ) {
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

    // Auto-create garantía when delivered, if none exists yet.
    // Reclamo de garantía (id_garantia_reclamada set) never gets a new one.
    if (
      estadoNuevo.nombre === 'entregado' &&
      !reparacion.raw.id_garantia_reclamada
    ) {
      const dias = dto.dias_garantia ?? 30;
      const existing = await this.dataSource.query<{ id_garantia: number }[]>(
        `SELECT id_garantia FROM garantias WHERE id_reparacion = $1`,
        [id],
      );
      if (!existing.length && dias > 0) {
        await this.dataSource.query(
          `INSERT INTO garantias (id_reparacion, fecha_inicio, fecha_fin, estado)
           VALUES ($1, CURRENT_DATE, CURRENT_DATE + $2 * INTERVAL '1 day', 'activa')`,
          [id, dias],
        );
      }
    }

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
    if (!repuesto)
      throw new RepuestoUsadoNotFoundException(reparacionId, repuestoId);

    await this.repuestoRepo.remove(repuesto);
  }

  // RF-26: Registra foto por etapa del servicio técnico, sube a R2 y persiste URL en JSONB.
  async uploadFoto(
    id: number,
    dto: UploadFotoReparacionDto,
    user: JwtPayload,
  ): Promise<{ url: string }> {
    await this.assertAccess(id, user.id_sede!);

    const buffer = Buffer.from(dto.imagen_base64, 'base64');
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[dto.content_type] ?? 'jpg';
    const estadoNorm = dto.estado.toLowerCase();
    const estadoSlug = estadoNorm.replace(/ /g, '-');
    const key = `fotos/reparaciones/${id}/${estadoSlug}-${Date.now()}.${ext}`;

    const r2Config = this.getR2Config();
    await this.s3.send(
      new PutObjectCommand({
        Bucket: r2Config.bucket,
        Key: key,
        Body: buffer,
        ContentType: dto.content_type,
      }),
    );

    const url = `${r2Config.publicUrl}/${key}`;
    await this.dataSource.query(
      `UPDATE reparaciones
       SET fotos = COALESCE(fotos, '[]'::jsonb) || $2::jsonb
       WHERE id_reparacion = $1`,
      [
        id,
        JSON.stringify([
          { url, etapa: estadoNorm, created_at: new Date().toISOString() },
        ]),
      ],
    );

    return { url };
  }

  // Valida y devuelve las variables de entorno de R2; lanza 500 si alguna falta.
  private getR2Config(): { bucket: string; publicUrl: string } {
    const required = [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
    ] as const;
    const missing = required.filter((k) => !this.config.get<string>(k));
    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Configuración R2 incompleta: ${missing.join(', ')}`,
      );
    }
    return {
      bucket: this.config.get<string>('R2_BUCKET_NAME')!,
      publicUrl: this.config.get<string>('R2_PUBLIC_URL')!,
    };
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

  // Convierte la fila cruda de la vista en el DTO de respuesta; calcula monto_total si viene repuestos_cost.
  private toResponse(row: ReparacionRow): ReparacionResponseDto {
    let montoTotal: number | undefined;
    if (row.repuestos_cost !== undefined) {
      const montoCotizado =
        (row.monto_cotizado !== null
          ? parseFloat(String(row.monto_cotizado))
          : 0) + parseFloat(row.repuestos_cost);
      const montoDesc = parseFloat(String(row.monto_descuento));
      if (row.tipo_descuento === 'porcentaje') {
        montoTotal = montoCotizado * (1 - montoDesc / 100);
      } else if (row.tipo_descuento === 'monto_fijo') {
        montoTotal = montoCotizado - montoDesc;
      } else {
        montoTotal = montoCotizado;
      }
      montoTotal = Math.max(0, parseFloat(montoTotal.toFixed(2)));
    }
    return {
      ...(montoTotal !== undefined ? { monto_total: montoTotal } : {}),
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
      monto_cotizado:
        row.monto_cotizado !== null
          ? parseFloat(String(row.monto_cotizado))
          : null,
      monto_descuento: parseFloat(String(row.monto_descuento)),
      tipo_descuento: row.tipo_descuento ?? null,
      justificacion_descuento: row.justificacion_descuento ?? null,
      tipo_servicio: row.tipo_servicio ?? null,
      tipo_accion: row.tipo_accion ?? 'reparacion',
      created_at: row.created_at,
      updated_at: row.updated_at ?? null,
      fotos: row.fotos ?? null,
      id_garantia_reclamada: row.id_garantia_reclamada ?? null,
    };
  }

  // Parsea los decimales de BD (que llegan como string en pg) a número.
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

  // Parsea el monto decimal a número; el resto de campos se mapean directamente.
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
