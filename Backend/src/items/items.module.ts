import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { Item } from './entities/item.entity';
import { Marca } from './entities/marca.entity';
import { Categoria } from './entities/categoria.entity';
import { ItemCategoria } from './entities/item-categoria.entity';
import { InventarioSede } from './entities/inventario-sede.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Item,
      Marca,
      Categoria,
      ItemCategoria,
      InventarioSede,
    ]),
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
