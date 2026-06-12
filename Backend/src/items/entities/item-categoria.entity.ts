import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Item } from './item.entity';
import { Categoria } from './categoria.entity';

@Entity('item_categorias')
export class ItemCategoria {
  @PrimaryColumn({ name: 'id_item' })
  id_item: number;

  @PrimaryColumn({ name: 'id_categoria' })
  id_categoria: number;

  @ManyToOne(() => Item, (i) => i.item_categorias)
  @JoinColumn({ name: 'id_item' })
  item: Item;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;
}
