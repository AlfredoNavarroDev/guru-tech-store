import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DataSource, Repository } from 'typeorm';
import { Reparacion } from './entities/reparacion.entity';
import { ReparacionRepuesto } from './entities/reparacion-repuesto.entity';
import { Garantia } from '../garantias/entities/garantia.entity';
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
    @InjectRepository(Garantia)
    private readonly garantiaRepo: Repository<Garantia>,
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
    const estadoRow = await this.dataSource
      .createQueryBuilder()
      .select('e.id_estado', 'id_estado')
      .addSelect('e.nombre', 'nombre')
      .addSelect('e.es_final', 'es_final')
      .from('estados_reparacion', 'e')
      .orderBy('e.orden', 'ASC')
      .limit(1)
      .getRawOne<EstadoRow>();

    if (!estadoRow) {
      throw new InternalServerErrorException(
        'No hay estados de reparación configurados',
      );
    }

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
    const applyConditions = (
      qb: ReturnType<DataSource['createQueryBuilder']>,
    ) => {
      qb.where('r.id_sede = :idSede', { idSede: user.id_sede! });
      if (query.id_cliente !== undefined)
        qb.andWhere('r.id_cliente = :idCliente', {
          idCliente: query.id_cliente,
        });
      if (query.id_estado !== undefined)
        qb.andWhere('r.id_estado = :idEstado', { idEstado: query.id_estado });
      if (query.fecha_desde)
        qb.andWhere('r.fecha_ingreso >= :fechaDesde', {
          fechaDesde: query.fecha_desde,
        });
      if (query.fecha_hasta)
        qb.andWhere('r.fecha_ingreso <= :fechaHasta', {
          fechaHasta: `${query.fecha_hasta} 23:59:59`,
        });
      if (query.marca)
        qb.andWhere('r.marca ILIKE :marca', { marca: `%${query.marca}%` });
      if (query.modelo)
        qb.andWhere('r.modelo ILIKE :modelo', { modelo: `%${query.modelo}%` });
      if (query.imei)
        qb.andWhere('r.imei ILIKE :imei', { imei: `%${query.imei}%` });
      return qb;
    };

    const [countResult, rows] = await Promise.all([
      applyConditions(
        this.dataSource
          .createQueryBuilder()
          .select('COUNT(*)', 'total')
          .from('v_reparacion_lista', 'r'),
      ).getRawOne<CountRow>(),
      applyConditions(
        this.dataSource
          .createQueryBuilder()
          .select('r.*')
          .from('v_reparacion_lista', 'r'),
      )
        .orderBy('r.fecha_ingreso', 'DESC')
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .getRawMany<ReparacionRow>(),
    ]);

    const total = parseInt(countResult?.total ?? '0', 10);

    return {
      items: rows.map(this.toResponse),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // HU-18: Detalle completo con repuestos usados, pagos, total pagado y saldo pendiente.
  async findOne(id: number, user: JwtPayload): Promise<ReparacionResponseDto> {
    const [row, repuestos, pagos] = await Promise.all([
      this.dataSource
        .createQueryBuilder()
        .select('r.*')
        .from('v_reparacion_lista', 'r')
        .where('r.id_reparacion = :id', { id })
        .andWhere('r.id_sede = :idSede', { idSede: user.id_sede! })
        .getRawOne<ReparacionRow>(),

      this.dataSource
        .createQueryBuilder()
        .select('rru.id_repuesto_u', 'id_repuesto_u')
        .addSelect('rru.id_item', 'id_item')
        .addSelect('i.nombre', 'item_nombre')
        .addSelect('i.sku', 'sku')
        .addSelect('rru.cantidad', 'cantidad')
        .addSelect('rru.precio_cobrado', 'precio_cobrado')
        .addSelect('rru.costo_unitario_momento', 'costo_unitario_momento')
        .from('reparacion_repuestos_usados', 'rru')
        .leftJoin('items', 'i', 'i.id_item = rru.id_item')
        .where('rru.id_reparacion = :id', { id })
        .getRawMany<RepuestoRow>(),

      this.dataSource
        .createQueryBuilder()
        .select('p.id_pago', 'id_pago')
        .addSelect('p.metodo_pago', 'metodo_pago')
        .addSelect('p.monto', 'monto')
        .addSelect('p.es_adelanto', 'es_adelanto')
        .addSelect('p.fecha_pago', 'fecha_pago')
        .from('pagos', 'p')
        .where('p.id_reparacion = :id', { id })
        .orderBy('p.fecha_pago', 'ASC')
        .getRawMany<PagoRow>(),
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

    const estadoNuevo = await this.dataSource
      .createQueryBuilder()
      .select('e.id_estado', 'id_estado')
      .addSelect('e.nombre', 'nombre')
      .addSelect('e.es_final', 'es_final')
      .addSelect('e.orden', 'orden')
      .from('estados_reparacion', 'e')
      .where('e.id_estado = :idEstado', { idEstado: dto.id_estado })
      .getRawOne<EstadoRow>();

    if (!estadoNuevo) throw new EstadoReparacionNotFoundException(dto.id_estado);

    const estadoActual = await this.dataSource
      .createQueryBuilder()
      .select('e.orden', 'orden')
      .from('estados_reparacion', 'e')
      .where('e.id_estado = :idEstado', { idEstado: reparacion.raw.id_estado })
      .getRawOne<{ orden: number }>();

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.reparacionRepo.update(id, updates as any);

    // Auto-create garantía when delivered, if none exists yet.
    // Reclamo de garantía (id_garantia_reclamada set) never gets a new one.
    if (
      estadoNuevo.nombre === 'entregado' &&
      !reparacion.raw.id_garantia_reclamada
    ) {
      const dias = dto.dias_garantia ?? 15;
      const existing = await this.garantiaRepo.findOne({
        where: { id_reparacion: id },
      });
      if (!existing && dias > 0) {
        const fechaInicio = new Date();
        const fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaFin.getDate() + dias);
        await this.garantiaRepo.save(
          this.garantiaRepo.create({
            id_reparacion: id,
            id_venta: null,
            fecha_inicio: fechaInicio.toISOString().split('T')[0],
            fecha_fin: fechaFin.toISOString().split('T')[0],
            estado: 'activa',
          }),
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

      const row = await this.dataSource
        .createQueryBuilder()
        .select('rru.id_repuesto_u', 'id_repuesto_u')
        .addSelect('rru.id_item', 'id_item')
        .addSelect('i.nombre', 'item_nombre')
        .addSelect('i.sku', 'sku')
        .addSelect('rru.cantidad', 'cantidad')
        .addSelect('rru.precio_cobrado', 'precio_cobrado')
        .addSelect('rru.costo_unitario_momento', 'costo_unitario_momento')
        .from('reparacion_repuestos_usados', 'rru')
        .leftJoin('items', 'i', 'i.id_item = rru.id_item')
        .where('rru.id_repuesto_u = :id', { id: saved.id_repuesto_u })
        .getRawOne<RepuestoRow>();

      return this.toRepuestoResponse(row!);
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
    const result = await this.assertAccess(id, user.id_sede!);

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
    const nuevaFoto = { url, etapa: estadoNorm, created_at: new Date().toISOString() };
    const fotosActualizadas = [...(result.raw.fotos ?? []), nuevaFoto];

    await this.reparacionRepo.update(id, { fotos: fotosActualizadas });

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
    const row = await this.dataSource
      .createQueryBuilder()
      .select('r.*')
      .addSelect('er.es_final', 'es_final')
      .addSelect('er.nombre', 'estado')
      .from('reparaciones', 'r')
      .leftJoin('estados_reparacion', 'er', 'er.id_estado = r.id_estado')
      .where('r.id_reparacion = :id', { id })
      .andWhere('r.id_sede = :idSede', { idSede })
      .getRawOne<ReparacionRow>();

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
