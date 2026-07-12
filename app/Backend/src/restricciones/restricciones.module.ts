import { Module } from '@nestjs/common';
import { RestriccionesController } from './restricciones.controller';
import { RestriccionesService } from './restricciones.service';

@Module({
  controllers: [RestriccionesController],
  providers: [RestriccionesService],
  exports: [RestriccionesService],
})
export class RestriccionesModule {}
