import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromocionesController } from './promociones.controller';
import { PromocionesService } from './promociones.service';
import { Promocion } from './entities/promocion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Promocion])],
  controllers: [PromocionesController],
  providers: [PromocionesService],
})
export class PromocionesModule {}
