import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CambioProducto } from './entities/cambio-producto.entity';
import { CambiosService } from './cambios.service';
import { CambiosController } from './cambios.controller';
import { BoletasModule } from '../boletas/boletas.module';

// Módulo de cambios: importa BoletasModule para poder emitir boletas desde el controlador.
@Module({
  imports: [TypeOrmModule.forFeature([CambioProducto]), BoletasModule],
  controllers: [CambiosController],
  providers: [CambiosService],
})
export class CambiosModule {}
