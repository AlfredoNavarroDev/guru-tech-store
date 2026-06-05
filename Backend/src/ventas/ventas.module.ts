import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { PagosModule } from '../pagos/pagos.module';
import { BoletasModule } from '../boletas/boletas.module';

/**
 * @purpose Módulo de ventas. Registra Venta + DetalleVenta en TypeORM.
 * Importa PagosModule y BoletasModule para endpoints anidados.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, DetalleVenta]),
    PagosModule,
    BoletasModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
