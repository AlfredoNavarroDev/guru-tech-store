import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosService } from './pagos.service';
import { Pago } from './entities/pago.entity';

// Módulo de pagos. Sin controlador propio; exporta PagosService para otros módulos.
@Module({
  imports: [TypeOrmModule.forFeature([Pago])],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
