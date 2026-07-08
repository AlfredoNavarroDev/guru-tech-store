import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { CompraRefill } from './entities/compra-refill.entity';
import { DetalleCompraRefill } from './entities/detalle-compra-refill.entity';

// Módulo de compras: registra las entidades ORM y expone el controlador REST.
@Module({
  imports: [TypeOrmModule.forFeature([CompraRefill, DetalleCompraRefill])],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
