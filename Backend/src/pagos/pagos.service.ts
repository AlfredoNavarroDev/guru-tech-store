import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pago } from './entities/pago.entity';
import { CreatePagoVentaDto } from './dto/create-pago-venta.dto';
import { VentaNotFoundException } from '../common/exceptions';

/**
 * @purpose Servicio de pagos. Pago separado de venta → permite cobro diferido
 * y pagos mixtos (múltiples abonos con distintos métodos).
 * Tabla Pagos usa XOR: id_venta o id_reparacion (nunca ambos).
 */
@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepo: Repository<Pago>,
    // DataSource para assertVentaExists (SQL crudo, sin cargar entidad).
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registra pago para venta. No valida que total de pagos cubra la venta
   * (regla de caja/cierre de turno → Sprint futuro).
   */
  async createForVenta(
    idVenta: number,
    dto: CreatePagoVentaDto,
  ): Promise<Pago> {
    await this.assertVentaExists(idVenta);
    const pago = this.pagoRepo.create({
      id_venta: idVenta,
      // id_reparacion null: este método es exclusivo de ventas.
      id_reparacion: null,
      metodo_pago: dto.metodo_pago,
      monto: dto.monto,
      // Adelantos solo en reparaciones (cliente deja seña).
      es_adelanto: false,
      referencia_transaccion: dto.referencia_transaccion ?? null,
    });
    return this.pagoRepo.save(pago);
  }

  /** Pagos de una venta (útil para cierre de caja). */
  async findByVenta(idVenta: number): Promise<Pago[]> {
    await this.assertVentaExists(idVenta);
    return this.pagoRepo.find({ where: { id_venta: idVenta } });
  }

  /** Verifica existencia de venta sin cargar entidad completa. 404 si no existe. */
  private async assertVentaExists(idVenta: number): Promise<void> {
    const rows = await this.dataSource.query<{ id_venta: number }[]>(
      `SELECT id_venta FROM Ventas WHERE id_venta = $1`,
      [idVenta],
    );
    if (!rows.length) throw new VentaNotFoundException(idVenta);
  }
}
