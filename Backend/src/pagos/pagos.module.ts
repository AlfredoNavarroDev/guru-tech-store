import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosService } from './pagos.service';
import { Pago } from './entities/pago.entity';

/**
 * @purpose Módulo de pagos. Sin controlador propio → rutas en VentasController.
 * Exporta PagosService para reutilizar en otros módulos (ej: reparaciones).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Pago])],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
