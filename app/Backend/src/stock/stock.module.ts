import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockView } from './entities/stock-view.entity';
import { StockCriticoView } from './entities/stock-critico-view.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockView, StockCriticoView])],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
