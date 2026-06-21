import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pago } from './entities/pago.entity';
import { CreatePagoVentaDto } from './dto/create-pago-venta.dto';
import { CreatePagoReparacionDto } from './dto/create-pago-reparacion.dto';
import {
  ReparacionNotFoundException,
  VentaNotFoundException,
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
  async findByReparacion(idReparacion: number, user: JwtPayload): Promise<Pago[]> {
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
