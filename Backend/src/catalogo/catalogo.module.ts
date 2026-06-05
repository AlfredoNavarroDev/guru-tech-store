import { Module } from '@nestjs/common';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';

// Módulo de catálogo (solo lectura). Usa DataSource directo sobre vista SQL.
@Module({
  controllers: [CatalogoController],
  providers: [CatalogoService],
})
export class CatalogoModule {}
