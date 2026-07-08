import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReparacionesController } from './reparaciones.controller';
import { ReparacionesService } from './reparaciones.service';
import { Reparacion } from './entities/reparacion.entity';
import { ReparacionRepuesto } from './entities/reparacion-repuesto.entity';
import { PagosModule } from '../pagos/pagos.module';
import { BoletasModule } from '../boletas/boletas.module';

// Módulo de reparaciones: expone rutas de servicio técnico e integra pagos y boletas.
@Module({
  imports: [
    // Registra las entidades de reparaciones para acceso via repositorio en este módulo.
    TypeOrmModule.forFeature([Reparacion, ReparacionRepuesto]),
    PagosModule,
    BoletasModule,
  ],
  controllers: [ReparacionesController],
  providers: [ReparacionesService],
  // Exporta el servicio para que otros módulos (ej. garantías) puedan reutilizarlo.
  exports: [ReparacionesService],
})
export class ReparacionesModule {}
