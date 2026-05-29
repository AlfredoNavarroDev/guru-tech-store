import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoletasController } from './boletas.controller';
import { BoletasService } from './boletas.service';
import { Boleta } from './entities/boleta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Boleta])],
  controllers: [BoletasController],
  providers: [BoletasService],
  exports: [BoletasService],
})
export class BoletasModule {}
