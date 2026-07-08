import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GarantiasController } from './garantias.controller';
import { GarantiasService } from './garantias.service';
import { Garantia } from './entities/garantia.entity';
import { ReparacionesModule } from '../reparaciones/reparaciones.module';

// Módulo de garantías. Importa ReparacionesModule para poder crear reparaciones al reclamar.
@Module({
  imports: [TypeOrmModule.forFeature([Garantia]), ReparacionesModule],
  controllers: [GarantiasController],
  providers: [GarantiasService],
})
export class GarantiasModule {}
