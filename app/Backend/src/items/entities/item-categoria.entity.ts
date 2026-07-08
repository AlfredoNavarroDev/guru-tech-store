import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Item } from './item.entity';
import { Categoria } from './categoria.entity';

// Tabla pivote N:M entre ítems y categorías; la PK compuesta (id_item, id_categoria) garantiza unicidad.
@Entity('item_categorias')
export class ItemCategoria {
  // Parte 1 de la PK compuesta: referencia al ítem.
  @PrimaryColumn({ name: 'id_item' })
  id_item: number;

  // Parte 2 de la PK compuesta: referencia a la categoría.
  @PrimaryColumn({ name: 'id_categoria' })
  id_categoria: number;

  @ManyToOne(() => Item, (i) => i.item_categorias)
  @JoinColumn({ name: 'id_item' })
  item: Item;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;
}
