import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

// Módulo de stock: usa DataSource directo sobre vistas SQL, sin entidad TypeORM propia.
@Module({
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
