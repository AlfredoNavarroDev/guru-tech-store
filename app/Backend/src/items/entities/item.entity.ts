import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ItemCategoria } from './item-categoria.entity';

// Entidad que representa un artículo del catálogo; puede ser un producto de venta o un repuesto para reparaciones.
@Entity('items')
export class Item {
  @PrimaryGeneratedColumn({ name: 'id_item' })
  id_item: number;

  // Discrimina si el ítem se vende como producto final o se usa como repuesto en reparaciones.
  @Column('varchar', { name: 'tipo', length: 15 })
  tipo: 'producto' | 'repuesto';

  // Código único de referencia del ítem; se valida su unicidad antes de insertar.
  @Column({ name: 'sku', length: 50, unique: true })
  sku: string;

  @Column({ name: 'nombre', length: 255 })
  nombre: string;

  // FK opcional a la tabla marcas; puede ser null si el ítem no tiene marca asociada.
  @Column({ name: 'id_marca', type: 'int', nullable: true })
  id_marca: number | null;

  @Column('varchar', { name: 'modelo', length: 100, nullable: true })
  modelo: string | null;

  // Indica la calidad del repuesto (p.ej. 'original', 'compatible'); solo aplica a tipo=repuesto.
  @Column('varchar', { name: 'calidad', length: 30, nullable: true })
  calidad: string | null;

  @Column({
    name: 'precio_compra_actual',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  precio_compra_actual: number;

  @Column({
    name: 'precio_venta_actual',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  precio_venta_actual: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;

  // Relación con la tabla pivote item_categorias; cascade permite borrar las relaciones al eliminar el ítem.
  @OneToMany(() => ItemCategoria, (ic) => ic.item, { cascade: true })
  item_categorias: ItemCategoria[];
}
