import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoletasController } from './boletas.controller';
import { BoletasService } from './boletas.service';
import { Boleta } from './entities/boleta.entity';

/**
 * @purpose Módulo de boletas. Exporta BoletasService para VentasModule.
 * Rutas HTTP en VentasController (/ventas/:id/boletas).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Boleta])],
  controllers: [BoletasController],
  providers: [BoletasService],
  exports: [BoletasService], // VentasModule llama emitir() y findByVenta().
})
export class BoletasModule {}
