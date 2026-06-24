import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GarantiasController } from './garantias.controller';
import { GarantiasService } from './garantias.service';
import { Garantia } from './entities/garantia.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Garantia])],
  controllers: [GarantiasController],
  providers: [GarantiasService],
})
export class GarantiasModule {}
