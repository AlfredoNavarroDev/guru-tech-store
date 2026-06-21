import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReparacionesController } from './reparaciones.controller';
import { ReparacionesService } from './reparaciones.service';
import { Reparacion } from './entities/reparacion.entity';
import { ReparacionRepuesto } from './entities/reparacion-repuesto.entity';
import { PagosModule } from '../pagos/pagos.module';
import { BoletasModule } from '../boletas/boletas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reparacion, ReparacionRepuesto]),
    PagosModule,
    BoletasModule,
  ],
  controllers: [ReparacionesController],
  providers: [ReparacionesService],
})
export class ReparacionesModule {}
