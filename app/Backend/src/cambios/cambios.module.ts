import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CambioProducto } from './entities/cambio-producto.entity';
import { CambiosService } from './cambios.service';
import { CambiosController } from './cambios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CambioProducto])],
  controllers: [CambiosController],
  providers: [CambiosService],
})
export class CambiosModule {}
