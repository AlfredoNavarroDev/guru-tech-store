import { Module } from '@nestjs/common';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';

/**
 * @purpose Módulo de catálogo (solo lectura). Sin TypeOrmModule.forFeature
 * → CatalogoService usa DataSource directo sobre vista SQL.
 */
@Module({
  controllers: [CatalogoController],
  providers: [CatalogoService],
})
export class CatalogoModule {}
