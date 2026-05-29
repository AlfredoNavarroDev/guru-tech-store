import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pago } from './entities/pago.entity';
import { CreatePagoVentaDto } from './dto/create-pago-venta.dto';

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepo: Repository<Pago>,
    private readonly dataSource: DataSource,
  ) {}

  async createForVenta(
    idVenta: number,
    dto: CreatePagoVentaDto,
  ): Promise<Pago> {
    await this.assertVentaExists(idVenta);
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

  async findByVenta(idVenta: number): Promise<Pago[]> {
    await this.assertVentaExists(idVenta);
    return this.pagoRepo.find({ where: { id_venta: idVenta } });
  }

  private async assertVentaExists(idVenta: number): Promise<void> {
    const rows = await this.dataSource.query<{ id_venta: number }[]>(
      `SELECT id_venta FROM Ventas WHERE id_venta = $1`,
      [idVenta],
    );
    if (!rows.length)
      throw new NotFoundException(`Venta ${idVenta} no encontrada`);
  }
}
