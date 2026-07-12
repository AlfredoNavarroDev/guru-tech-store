import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pago } from './entities/pago.entity';
import { CreatePagoVentaDto } from './dto/create-pago-venta.dto';
import { CreatePagoReparacionDto } from './dto/create-pago-reparacion.dto';
import {
  ReparacionNotFoundException,
  VentaNotFoundException,
  PagoExcedeSaldoException,
  PagoSinPrecioException,
} from '../common/exceptions';
import type { JwtPayload } from '../common/types';

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepo: Repository<Pago>,
    private readonly dataSource: DataSource,
  ) {}

  async createForVenta(idVenta: number, dto: CreatePagoVentaDto, user: JwtPayload): Promise<Pago> {
    await this.assertVentaOwnedByUser(idVenta, user.sub);
    const pago = this.pagoRepo.create({
      id_venta: idVenta,
      id_reparacion: null,
      metodo_pago: dto.metodo_pago,
      monto: dto.monto,
      es_adelanto: false,
      referencia_transaccion: dto.referencia_transaccion ?? null,
    });
    return this.pagoRepo.save(pago);
  }

  async findByVenta(idVenta: number, user: JwtPayload): Promise<Pago[]> {
    await this.assertVentaOwnedByUser(idVenta, user.sub);
    return this.pagoRepo.find({ where: { id_venta: idVenta } });
  }

  async createForReparacion(
    idReparacion: number,
    dto: CreatePagoReparacionDto,
    user: JwtPayload,
  ): Promise<Pago> {
    await this.assertReparacionInSede(idReparacion, user.id_sede!);

    const rep = await this.dataSource
      .createQueryBuilder()
      .select('r.monto_cotizado', 'monto_cotizado')
      .addSelect('r.monto_descuento', 'monto_descuento')
      .addSelect('r.tipo_descuento', 'tipo_descuento')
      .from('reparaciones', 'r')
      .where('r.id_reparacion = :id', { id: idReparacion })
      .getRawOne<{ monto_cotizado: string | null; monto_descuento: string; tipo_descuento: string | null }>();

    const repRow = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(rru.cantidad * rru.precio_cobrado), 0)', 'repuestos_cost')
      .from('reparacion_repuestos_usados', 'rru')
      .where('rru.id_reparacion = :id', { id: idReparacion })
      .getRawOne<{ repuestos_cost: string }>();

    const montoCotizado =
      (rep?.monto_cotizado != null ? parseFloat(rep.monto_cotizado) : 0) +
      parseFloat(repRow?.repuestos_cost ?? '0');

    if (!rep || montoCotizado === 0) {
      throw new PagoSinPrecioException(idReparacion);
    }

    const montoDesc = parseFloat(rep.monto_descuento);
    let totalCobrar: number;
    if (rep.tipo_descuento === 'porcentaje') {
      totalCobrar = montoCotizado * (1 - montoDesc / 100);
    } else if (rep.tipo_descuento === 'monto_fijo') {
      totalCobrar = montoCotizado - montoDesc;
    } else {
      totalCobrar = montoCotizado;
    }

    const pagoRow = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(p.monto), 0)', 'total_pagado')
      .from('pagos', 'p')
      .where('p.id_reparacion = :id', { id: idReparacion })
      .getRawOne<{ total_pagado: string }>();

    const saldo = totalCobrar - parseFloat(pagoRow?.total_pagado ?? '0');

    if (dto.monto > saldo + 0.005) {
      throw new PagoExcedeSaldoException(dto.monto, Math.max(0, saldo));
    }

    const pago = this.pagoRepo.create({
      id_reparacion: idReparacion,
      id_venta: null,
      metodo_pago: dto.metodo_pago,
      monto: dto.monto,
      es_adelanto: dto.es_adelanto ?? false,
      referencia_transaccion: dto.referencia_transaccion ?? null,
    });
    return this.pagoRepo.save(pago);
  }

  async findByReparacion(idReparacion: number, user: JwtPayload): Promise<Pago[]> {
    await this.assertReparacionInSede(idReparacion, user.id_sede!);
    return this.pagoRepo.find({ where: { id_reparacion: idReparacion } });
  }

  private async assertVentaOwnedByUser(idVenta: number, idEmpleado: number): Promise<void> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select('v.id_venta', 'id_venta')
      .from('ventas', 'v')
      .where('v.id_venta = :idVenta AND v.id_empleado = :idEmpleado', { idVenta, idEmpleado })
      .getRawOne<{ id_venta: number }>();
    if (!row) throw new VentaNotFoundException(idVenta);
  }

  private async assertReparacionInSede(idReparacion: number, idSede: number): Promise<void> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select('r.id_reparacion', 'id_reparacion')
      .from('reparaciones', 'r')
      .where('r.id_reparacion = :idReparacion AND r.id_sede = :idSede', { idReparacion, idSede })
      .getRawOne<{ id_reparacion: number }>();
    if (!row) throw new ReparacionNotFoundException(idReparacion);
  }
}
