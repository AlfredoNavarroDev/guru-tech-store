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

// Servicio de pagos. Permite cobro diferido y pagos mixtos con distintos métodos.
@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepo: Repository<Pago>,
    // DataSource para assertVentaExists (SQL crudo, sin cargar entidad).
    private readonly dataSource: DataSource,
  ) {}

  // Registra pago para venta. No valida cobertura total (regla de cierre futuro).
  async createForVenta(
    idVenta: number,
    dto: CreatePagoVentaDto,
    user: JwtPayload,
  ): Promise<Pago> {
    await this.assertVentaOwnedByUser(idVenta, user.sub);
    const pago = this.pagoRepo.create({
      id_venta: idVenta,
      // id_reparacion null: este método es exclusivo de ventas.
      id_reparacion: null,
      metodo_pago: dto.metodo_pago,
      monto: dto.monto,
      // Adelantos solo en reparaciones.
      es_adelanto: false,
      referencia_transaccion: dto.referencia_transaccion ?? null,
    });
    return this.pagoRepo.save(pago);
  }

  // Pagos de una venta (útil para cierre de caja).
  async findByVenta(idVenta: number, user: JwtPayload): Promise<Pago[]> {
    await this.assertVentaOwnedByUser(idVenta, user.sub);
    return this.pagoRepo.find({ where: { id_venta: idVenta } });
  }

  // HU-19: Registra adelanto o pago final de reparación.
  async createForReparacion(
    idReparacion: number,
    dto: CreatePagoReparacionDto,
    user: JwtPayload,
  ): Promise<Pago> {
    await this.assertReparacionInSede(idReparacion, user.id_sede!);

    // Obtiene precio de mano de obra, descuento y tipo de descuento de la reparación.
    const [rep] = await this.dataSource.query<
      {
        monto_cotizado: string | null;
        monto_descuento: string;
        tipo_descuento: string | null;
      }[]
    >(
      `SELECT monto_cotizado, monto_descuento, tipo_descuento FROM reparaciones WHERE id_reparacion = $1`,
      [idReparacion],
    );

    // Suma el coste de los repuestos usados para incluirlo en el total a cobrar.
    const [{ repuestos_cost }] = await this.dataSource.query<
      { repuestos_cost: string }[]
    >(
      `SELECT COALESCE(SUM(cantidad * precio_cobrado), 0) AS repuestos_cost
       FROM reparacion_repuestos_usados WHERE id_reparacion = $1`,
      [idReparacion],
    );

    // monto_cotizado = mano de obra/servicio; el total a cobrar suma repuestos.
    const montoCotizado =
      (rep?.monto_cotizado !== null && rep?.monto_cotizado !== undefined
        ? parseFloat(rep.monto_cotizado)
        : 0) + parseFloat(repuestos_cost);

    if (!rep || montoCotizado === 0) {
      throw new PagoSinPrecioException(idReparacion);
    }

    const montoDesc = parseFloat(rep.monto_descuento);
    // Aplica el descuento según su tipo: porcentual o monto fijo; sin descuento si es null.
    let totalCobrar: number;
    if (rep.tipo_descuento === 'porcentaje') {
      totalCobrar = montoCotizado * (1 - montoDesc / 100);
    } else if (rep.tipo_descuento === 'monto_fijo') {
      totalCobrar = montoCotizado - montoDesc;
    } else {
      totalCobrar = montoCotizado;
    }

    // Suma los pagos previos para calcular el saldo pendiente antes de aceptar el nuevo pago.
    const [{ total_pagado }] = await this.dataSource.query<
      { total_pagado: string }[]
    >(
      `SELECT COALESCE(SUM(monto), 0) AS total_pagado FROM pagos WHERE id_reparacion = $1`,
      [idReparacion],
    );

    const saldo = totalCobrar - parseFloat(total_pagado);

    // Tolerancia de medio céntimo para evitar rechazos por redondeo de punto flotante.
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

  // Pagos de una reparación (adelantos + pagos finales).
  async findByReparacion(
    idReparacion: number,
    user: JwtPayload,
  ): Promise<Pago[]> {
    await this.assertReparacionInSede(idReparacion, user.id_sede!);
    return this.pagoRepo.find({ where: { id_reparacion: idReparacion } });
  }

  // Verifica existencia y ownership sin cargar entidad completa.
  private async assertVentaOwnedByUser(
    idVenta: number,
    idEmpleado: number,
  ): Promise<void> {
    const rows = await this.dataSource.query<{ id_venta: number }[]>(
      `SELECT id_venta FROM Ventas WHERE id_venta = $1 AND id_empleado = $2`,
      [idVenta, idEmpleado],
    );
    if (!rows.length) throw new VentaNotFoundException(idVenta);
  }

  // Confirma que la reparación existe en la sede del usuario antes de operar sobre ella.
  private async assertReparacionInSede(
    idReparacion: number,
    idSede: number,
  ): Promise<void> {
    const rows = await this.dataSource.query<{ id_reparacion: number }[]>(
      `SELECT id_reparacion FROM reparaciones WHERE id_reparacion = $1 AND id_sede = $2`,
      [idReparacion, idSede],
    );
    if (!rows.length) throw new ReparacionNotFoundException(idReparacion);
  }
}
