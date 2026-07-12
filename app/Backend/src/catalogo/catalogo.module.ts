import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';
import { CatalogoView } from './entities/catalogo-view.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogoView])],
  controllers: [CatalogoController],
  providers: [CatalogoService],
})
export class CatalogoModule {}
