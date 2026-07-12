import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CambioProducto } from './entities/cambio-producto.entity';
import { CambiosService } from './cambios.service';
import { CambiosController } from './cambios.controller';
import { NotasVentaModule } from '../notas-venta/notas-venta.module';

// Módulo de cambios: importa NotasVentaModule para emitir notas de venta desde el controlador.
@Module({
  imports: [TypeOrmModule.forFeature([CambioProducto]), NotasVentaModule],
  controllers: [CambiosController],
  providers: [CambiosService],
})
export class CambiosModule {}
