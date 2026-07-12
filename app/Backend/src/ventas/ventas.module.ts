import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { PagosModule } from '../pagos/pagos.module';
import { NotasVentaModule } from '../notas-venta/notas-venta.module';

// Módulo de ventas. Registra Venta y DetalleVenta. Importa PagosModule y NotasVentaModule.
@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, DetalleVenta]),
    PagosModule,
    NotasVentaModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
