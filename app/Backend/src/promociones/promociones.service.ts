import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { CreatePromocionDto } from './dto/create-promocion.dto';
import type { UpdatePromocionDto } from './dto/update-promocion.dto';
import { Promocion } from './entities/promocion.entity';

interface JwtPayload {
  sub: number;
  id_sede: number;
  rol: string;
  nombre: string;
}

@Injectable()
export class PromocionesService {
  constructor(
    @InjectRepository(Promocion)
    private readonly promoRepo: Repository<Promocion>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(user: JwtPayload): Promise<object[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('p.*')
      .addSelect('i.nombre', 'item_nombre')
      .addSelect('c.nombre_categoria', 'nombre_categoria')
      .addSelect('s.nombre', 'sede_nombre')
      .addSelect('e.nombre_completo', 'creado_por_nombre')
      .addSelect(
        `(SELECT r.nombre_rol FROM empleados e2 JOIN roles r ON r.id_rol = e2.id_rol WHERE e2.id_empleado = p.created_by LIMIT 1)`,
        'created_by_rol',
      )
      .from('promociones', 'p')
      .leftJoin('items', 'i', 'i.id_item = p.id_item_afectado')
      .leftJoin('categorias', 'c', 'c.id_categoria = p.id_categoria_afectada')
      .leftJoin('sedes', 's', 's.id_sede = p.id_sede')
      .leftJoin('empleados', 'e', 'e.id_empleado = p.created_by')
      .orderBy('p.created_at', 'DESC');

    if (user.rol !== 'propietario') {
      qb.where('(p.id_sede = :idSede OR p.id_sede IS NULL)', { idSede: user.id_sede });
    }

    return qb.getRawMany();
  }

  private async checkConflict(
    idItem: number | null,
    idCategoria: number | null,
    idSede: number | null,
    fechaInicio: string | null,
    fechaFin: string | null,
    excludeId?: number,
  ): Promise<void> {
    if (!idItem && !idCategoria) return;

    const qb = this.dataSource
      .createQueryBuilder()
      .select('p.nombre', 'nombre')
      .from('promociones', 'p')
      .where("p.estado IN ('activa', 'pausada')")
      .limit(1);

    if (excludeId != null) {
      qb.andWhere('p.id_promocion != :excludeId', { excludeId });
    }

    const scope: string[] = [];
    if (idItem != null) scope.push('p.id_item_afectado = :idItem');
    if (idCategoria != null) scope.push('p.id_categoria_afectada = :idCategoria');
    qb.andWhere(`(${scope.join(' OR ')})`, {
      ...(idItem != null ? { idItem } : {}),
      ...(idCategoria != null ? { idCategoria } : {}),
    });

    if (idSede != null) {
      qb.andWhere('(p.id_sede IS NULL OR p.id_sede = :idSede)', { idSede });
    }
    if (fechaFin) {
      qb.andWhere('(p.fecha_inicio IS NULL OR p.fecha_inicio <= :fechaFin)', { fechaFin });
    }
    if (fechaInicio) {
      qb.andWhere('(p.fecha_fin IS NULL OR p.fecha_fin >= :fechaInicio)', { fechaInicio });
    }

    const row = await qb.getRawOne<{ nombre: string }>();
    if (row) {
      throw new ConflictException(
        `Ya existe la promoción "${row.nombre}" activa para este ítem/categoría en ese período.`,
      );
    }
  }

  async create(dto: CreatePromocionDto, user: JwtPayload): Promise<{ id_promocion: number }> {
    if (dto.id_item_afectado && dto.id_categoria_afectada) {
      throw new BadRequestException(
        'Una promoción no puede aplicar a un ítem y una categoría al mismo tiempo.',
      );
    }

    const id_sede = user.rol === 'administrador' ? user.id_sede : (dto.id_sede ?? null);

    await this.checkConflict(
      dto.id_item_afectado ?? null,
      dto.id_categoria_afectada ?? null,
      id_sede,
      dto.fecha_inicio ?? null,
      dto.fecha_fin ?? null,
    );

    const entity = this.promoRepo.create({
      id_sede,
      nombre: dto.nombre,
      id_item_afectado: dto.id_item_afectado ?? null,
      id_categoria_afectada: dto.id_categoria_afectada ?? null,
      valor_descuento: dto.valor_descuento,
      tipo_descuento: dto.tipo_descuento,
      fecha_inicio: dto.fecha_inicio ?? null,
      fecha_fin: dto.fecha_fin ?? null,
      dia_semana: dto.dia_semana ?? null,
      created_by: user.sub,
    });
    const saved = await this.promoRepo.save(entity);
    return { id_promocion: saved.id_promocion };
  }

  async update(id: number, dto: UpdatePromocionDto, user: JwtPayload): Promise<void> {
    const promo = await this.assertAccess(id, user);

    const updates: Partial<Promocion> = {};
    if (dto.estado !== undefined) updates.estado = dto.estado;
    if (dto.valor_descuento !== undefined) updates.valor_descuento = dto.valor_descuento;
    if (dto.fecha_inicio !== undefined) updates.fecha_inicio = dto.fecha_inicio ?? null;
    if (dto.fecha_fin !== undefined) updates.fecha_fin = dto.fecha_fin ?? null;
    if (!Object.keys(updates).length) return;

    const nextEstado = dto.estado ?? promo.estado;
    const nextFechaInicio =
      dto.fecha_inicio !== undefined ? (dto.fecha_inicio ?? null) : promo.fecha_inicio;
    const nextFechaFin =
      dto.fecha_fin !== undefined ? (dto.fecha_fin ?? null) : promo.fecha_fin;

    if (nextEstado === 'activa') {
      await this.checkConflict(
        promo.id_item_afectado,
        promo.id_categoria_afectada,
        promo.id_sede,
        nextFechaInicio,
        nextFechaFin,
        id,
      );
    }

    await this.promoRepo.update({ id_promocion: id }, updates);
  }

  async remove(id: number, user: JwtPayload): Promise<void> {
    await this.assertAccess(id, user);
    await this.promoRepo.update({ id_promocion: id }, { estado: 'cancelada' });
  }

  private async assertAccess(id: number, user: JwtPayload): Promise<Promocion> {
    const promo = await this.promoRepo.findOne({ where: { id_promocion: id } });
    if (!promo) throw new NotFoundException(`Promocion #${id} not found`);
    if (user.rol === 'administrador') {
      if (promo.created_by) {
        const isOwner = await this.dataSource
          .createQueryBuilder()
          .select('1', 'x')
          .from('empleados', 'e')
          .innerJoin('roles', 'r', 'r.id_rol = e.id_rol')
          .where('e.id_empleado = :id', { id: promo.created_by })
          .andWhere("r.nombre_rol = 'propietario'")
          .getRawOne<{ x: string }>();
        if (isOwner) throw new ForbiddenException();
      }
      if (promo.id_sede !== user.id_sede) throw new ForbiddenException();
    }
    return promo;
  }
}
