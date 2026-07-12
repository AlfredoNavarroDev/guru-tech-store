import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { JwtPayload } from '../common/types';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import {
  GarantiaNoActivaException,
  GarantiaNotFoundException,
  GarantiaTipoInvalidoException,
  GarantiaYaExisteException,
  ReparacionNotFoundException,
} from '../common/exceptions';
import type { CreateGarantiaReparacionDto } from './dto/create-garantia-reparacion.dto';
import type { CreateReclamoGarantiaDto } from './dto/create-reclamo-garantia.dto';
import type { QueryGarantiasDto } from './dto/query-garantias.dto';
import type { GarantiaResponseDto } from './dto/garantia-response.dto';
import type { ReparacionResponseDto } from '../reparaciones/dto/reparacion-response.dto';
import { Garantia } from './entities/garantia.entity';
import { GarantiaReclamoView } from './entities/garantia-reclamo-view.entity';
import { Reparacion } from '../reparaciones/entities/reparacion.entity';
import { ReparacionesService } from '../reparaciones/reparaciones.service';
import { RestriccionesService } from '../restricciones/restricciones.service';

// Forma cruda de una fila de garantía devuelta por QueryBuilder (antes de mapear a DTO).
interface GarantiaRow {
  id_garantia: number;
  id_venta: number | null;
  id_reparacion: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  motivo_invalidacion: string | null;
  created_at: Date;
}

// Convierte una fila al DTO de respuesta, derivando el tipo y la etiqueta legible.
function mapToDto(row: GarantiaRow): GarantiaResponseDto {
  const tipo: 'venta' | 'reparacion' =
    row.id_venta !== null ? 'venta' : 'reparacion';
  return {
    id_garantia: row.id_garantia,
    tipo,
    id_venta: row.id_venta ?? null,
    id_reparacion: row.id_reparacion ?? null,
    // Etiqueta legible para el front sin necesidad de un JOIN adicional.
    referencia_label:
      tipo === 'venta'
        ? `Venta #${row.id_venta}`
        : `Reparación #${row.id_reparacion}`,
    fecha_inicio: String(row.fecha_inicio),
    fecha_fin: String(row.fecha_fin),
    estado: row.estado as GarantiaResponseDto['estado'],
    motivo_invalidacion: row.motivo_invalidacion ?? null,
    created_at: String(row.created_at),
  };
}

// Servicio de garantías: gestiona creación, reclamos y consultas con control de acceso por sede.
@Injectable()
export class GarantiasService {
  constructor(
    @InjectRepository(Garantia)
    private readonly garantiaRepo: Repository<Garantia>,
    @InjectRepository(GarantiaReclamoView)
    private readonly garantiaReclamoRepo: Repository<GarantiaReclamoView>,
    private readonly dataSource: DataSource,
    private readonly reparacionesService: ReparacionesService,
    private readonly restriccionesService: RestriccionesService,
  ) {}

  // Crea una garantía de reparación; verifica que la reparación pertenezca a la sede del técnico.
  async create(
    dto: CreateGarantiaReparacionDto,
    user: JwtPayload,
  ): Promise<GarantiaResponseDto> {
    if (user.rol !== 'tecnico') throw new ForbiddenException();

    if (new Date(dto.fecha_fin) <= new Date(dto.fecha_inicio)) {
      throw new BadRequestException(
        'fecha_fin debe ser posterior a fecha_inicio',
      );
    }

    // Confirma que la reparación existe y corresponde a la sede del técnico.
    const rep = await this.dataSource
      .createQueryBuilder()
      .select('r.id_reparacion', 'id_reparacion')
      .from('reparaciones', 'r')
      .where('r.id_reparacion = :id AND r.id_sede = :sede', {
        id: dto.id_reparacion,
        sede: user.id_sede,
      })
      .getRawOne<{ id_reparacion: number }>();
    if (!rep) throw new ReparacionNotFoundException(dto.id_reparacion);

    // Previene duplicar garantías activas sobre la misma reparación.
    const existing = await this.garantiaRepo.findOne({
      where: { id_reparacion: dto.id_reparacion, estado: 'activa' },
    });
    if (existing) throw new GarantiaYaExisteException(dto.id_reparacion);

    // Valida max_dias_garantia contra los repuestos usados en la reparación (si existen).
    const repuesto = await this.dataSource
      .createQueryBuilder()
      .select('rru.id_item', 'id_item')
      .from('reparacion_repuestos_usados', 'rru')
      .where('rru.id_reparacion = :id', { id: dto.id_reparacion })
      .limit(1)
      .getRawOne<{ id_item: number }>();
    if (repuesto) {
      const restriction =
        await this.restriccionesService.resolveItemRestriction(repuesto.id_item);
      const DEFAULT_MAX_DIAS = 15;
      const maxDias = restriction?.max_dias_garantia ?? DEFAULT_MAX_DIAS;
      const dias = Math.ceil(
        (new Date(dto.fecha_fin).getTime() -
          new Date(dto.fecha_inicio).getTime()) /
          86400000,
      );
      if (dias > maxDias) {
        throw new BadRequestException(
          `La garantía no puede superar ${maxDias} días para este producto`,
        );
      }
    }

    const saved = await this.garantiaRepo.save(
      this.garantiaRepo.create({
        id_reparacion: dto.id_reparacion,
        id_venta: null,
        fecha_inicio: dto.fecha_inicio,
        fecha_fin: dto.fecha_fin,
        estado: 'activa',
      }),
    );
    return mapToDto(saved as unknown as GarantiaRow);
  }

  // Reclamo de garantía de servicio técnico: crea reparación nueva ligada a la
  // garantía y la consume (invalidada) en la misma operación.
  async crearReclamo(
    idGarantia: number,
    dto: CreateReclamoGarantiaDto,
    user: JwtPayload,
  ): Promise<ReparacionResponseDto> {
    if (user.rol !== 'tecnico') throw new ForbiddenException();

    const garantia = await this.garantiaReclamoRepo.findOne({
      where: { id_garantia: idGarantia },
    });
    // Tipo check runs before sede check: venta garantías have no
    // id_reparacion, so there's no r.id_sede to compare against.
    if (!garantia) throw new GarantiaNotFoundException(idGarantia);
    // Solo se pueden reclamar garantías de reparación, no de venta.
    if (garantia.id_venta !== null) {
      throw new GarantiaTipoInvalidoException(idGarantia);
    }
    // Evita que un técnico de otra sede consuma la garantía.
    if (garantia.id_sede !== user.id_sede) {
      throw new GarantiaNotFoundException(idGarantia);
    }
    if (garantia.estado !== 'activa') {
      throw new GarantiaNoActivaException(idGarantia);
    }

    // Obtiene el primer estado del flujo de reparación para asignarlo a la nueva entrada.
    const estadoInicial = await this.dataSource
      .createQueryBuilder()
      .select('e.id_estado', 'id_estado')
      .from('estados_reparacion', 'e')
      .orderBy('e.orden', 'ASC')
      .limit(1)
      .getRawOne<{ id_estado: number }>();

    let nuevaReparacionId!: number;
    // Transacción atómica: inserta la reparación e invalida la garantía juntas.
    await this.dataSource.transaction(async (manager) => {
      const repRepo = manager.getRepository(Reparacion);
      const garRepo = manager.getRepository(Garantia);

      const nuevaRep = (await repRepo.save(
        repRepo.create({
          id_cliente: garantia.id_cliente!,
          id_tecnico: user.sub,
          id_sede: user.id_sede,
          // Los campos del equipo se heredan de la reparación original si no se sobreescriben.
          marca: dto.marca ?? garantia.marca,
          modelo: dto.modelo ?? garantia.modelo,
          imei: dto.imei ?? garantia.imei,
          esta_encendido: dto.esta_encendido ?? null,
          checklist_estado: dto.checklist_estado ?? null,
          diagnostico_tecnico: dto.diagnostico_tecnico ?? null,
          fecha_estimada: dto.fecha_estimada ?? null,
          id_estado: estadoInicial!.id_estado,
          id_garantia_reclamada: idGarantia,
          tipo_accion: dto.tipo_accion ?? 'reparacion',
        }),
      )) as Reparacion;
      nuevaReparacionId = nuevaRep.id_reparacion;

      // Marca la garantía como invalidada indicando qué reparación la consumió.
      await garRepo.update(idGarantia, {
        estado: 'invalidada',
        motivo_invalidacion: `Reclamo de garantía utilizado (reparación #${nuevaReparacionId})`,
      });
    });

    return this.reparacionesService.findOne(nuevaReparacionId, user);
  }

  // Lista garantías paginadas; construye JOIN y filtros dinámicamente según el rol.
  async findAll(
    user: JwtPayload,
    query: QueryGarantiasDto,
  ): Promise<PaginatedResult<GarantiaResponseDto>> {
    const sede = user.id_sede!;

    // Lazy update: marca como vencidas las garantías expiradas de esta sede antes de listar.
    await this.dataSource
      .createQueryBuilder()
      .update(Garantia)
      .set({ estado: 'vencida' as const, updated_at: () => 'now()' })
      .where(
        `estado = 'activa' AND fecha_fin < CURRENT_DATE
        AND (
          EXISTS (SELECT 1 FROM ventas v WHERE v.id_venta = garantias.id_venta AND v.id_sede = :sede)
          OR EXISTS (SELECT 1 FROM reparaciones r WHERE r.id_reparacion = garantias.id_reparacion AND r.id_sede = :sede)
        )`,
        { sede },
      )
      .execute();

    // Vendedor solo ve garantías de ventas; técnico solo ve las de reparaciones.
    const isVendedor = user.rol === 'vendedor';

    // Función auxiliar que construye el QB base con JOIN y filtros dinámicos.
    const buildBaseQb = () => {
      const qb = this.dataSource
        .createQueryBuilder()
        .select('*')
        .from('garantias', 'g');

      if (isVendedor) {
        qb.innerJoin('ventas', 'v', 'v.id_venta = g.id_venta').where(
          'v.id_sede = :sede AND g.id_venta IS NOT NULL',
          { sede },
        );
      } else {
        qb.innerJoin(
          'reparaciones',
          'r',
          'r.id_reparacion = g.id_reparacion',
        ).where('r.id_sede = :sede AND g.id_reparacion IS NOT NULL', { sede });
      }

      if (query.estado) {
        qb.andWhere('g.estado = :estado', { estado: query.estado });
      }
      if (query.id_reparacion) {
        qb.andWhere('g.id_reparacion = :idRep', {
          idRep: query.id_reparacion,
        });
      }

      return qb;
    };

    const countResult = await buildBaseQb()
      .select('COUNT(*)', 'total')
      .getRawOne<{ total: string }>();

    const rows = await buildBaseQb()
      .select('g.id_garantia', 'id_garantia')
      .addSelect('g.id_venta', 'id_venta')
      .addSelect('g.id_reparacion', 'id_reparacion')
      .addSelect('g.fecha_inicio', 'fecha_inicio')
      .addSelect('g.fecha_fin', 'fecha_fin')
      .addSelect('g.estado', 'estado')
      .addSelect('g.motivo_invalidacion', 'motivo_invalidacion')
      .addSelect('g.created_at', 'created_at')
      .orderBy('g.created_at', 'DESC')
      .limit(query.limit)
      .offset((query.page - 1) * query.limit)
      .getRawMany<GarantiaRow>();

    const total = parseInt(countResult!.total, 10);
    return {
      items: rows.map(mapToDto),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // Devuelve el detalle de una garantía verificando que pertenezca a la sede del usuario.
  async findOne(id: number, user: JwtPayload): Promise<GarantiaResponseDto> {
    const sede = user.id_sede!;

    // Lazy update for this specific garantia only.
    await this.dataSource
      .createQueryBuilder()
      .update(Garantia)
      .set({ estado: 'vencida' as const, updated_at: () => 'now()' })
      .where(
        `id_garantia = :id AND estado = 'activa' AND fecha_fin < CURRENT_DATE
        AND (
          EXISTS (SELECT 1 FROM ventas v WHERE v.id_venta = garantias.id_venta AND v.id_sede = :sede)
          OR EXISTS (SELECT 1 FROM reparaciones r WHERE r.id_reparacion = garantias.id_reparacion AND r.id_sede = :sede)
        )`,
        { id, sede },
      )
      .execute();

    // Filtro con EXISTS garantiza que el usuario no acceda a garantías de otras sedes.
    const row = await this.dataSource
      .createQueryBuilder()
      .select('g.id_garantia', 'id_garantia')
      .addSelect('g.id_venta', 'id_venta')
      .addSelect('g.id_reparacion', 'id_reparacion')
      .addSelect('g.fecha_inicio', 'fecha_inicio')
      .addSelect('g.fecha_fin', 'fecha_fin')
      .addSelect('g.estado', 'estado')
      .addSelect('g.motivo_invalidacion', 'motivo_invalidacion')
      .addSelect('g.created_at', 'created_at')
      .from('garantias', 'g')
      .where(
        `g.id_garantia = :id
        AND (
          EXISTS (SELECT 1 FROM ventas v WHERE v.id_venta = g.id_venta AND v.id_sede = :sede)
          OR EXISTS (SELECT 1 FROM reparaciones r WHERE r.id_reparacion = g.id_reparacion AND r.id_sede = :sede)
        )`,
        { id, sede },
      )
      .getRawOne<GarantiaRow>();

    if (!row) throw new GarantiaNotFoundException(id);
    return mapToDto(row);
  }
}
