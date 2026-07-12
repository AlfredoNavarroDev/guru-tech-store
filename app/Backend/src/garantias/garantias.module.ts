import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GarantiasController } from './garantias.controller';
import { GarantiasService } from './garantias.service';
import { Garantia } from './entities/garantia.entity';
import { ReparacionesModule } from '../reparaciones/reparaciones.module';
import { RestriccionesModule } from '../restricciones/restricciones.module';

// Módulo de garantías. Importa ReparacionesModule para reclamos y RestriccionesModule para validar max_dias_garantia.
@Module({
  imports: [
    TypeOrmModule.forFeature([Garantia]),
    ReparacionesModule,
    RestriccionesModule,
  ],
  controllers: [GarantiasController],
  providers: [GarantiasService],
})
export class GarantiasModule {}
