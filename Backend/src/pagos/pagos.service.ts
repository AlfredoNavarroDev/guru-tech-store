import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pago } from './entities/pago.entity';
import { CreatePagoVentaDto } from './dto/create-pago-venta.dto';
import { VentaNotFoundException } from '../common/exceptions';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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
}
