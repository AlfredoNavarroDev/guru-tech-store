import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotasVentaController } from './notas-venta.controller';
import { NotasVentaService } from './notas-venta.service';
import { NotaVenta } from './entities/nota-venta.entity';
import { PdfService } from '../common/pdf.service';

// Módulo de notas de venta. Exporta NotasVentaService para que VentasModule lo consuma.
@Module({
  imports: [TypeOrmModule.forFeature([NotaVenta])],
  controllers: [NotasVentaController],
  providers: [NotasVentaService, PdfService],
  exports: [NotasVentaService],
})
export class NotasVentaModule {}
