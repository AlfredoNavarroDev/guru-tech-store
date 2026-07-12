import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestriccionesController } from './restricciones.controller';
import { RestriccionesService } from './restricciones.service';
import { ItemRestriccion } from './entities/item-restriccion.entity';
import { CategoriaRestriccion } from './entities/categoria-restriccion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ItemRestriccion, CategoriaRestriccion])],
  controllers: [RestriccionesController],
  providers: [RestriccionesService],
  exports: [RestriccionesService],
})
export class RestriccionesModule {}
