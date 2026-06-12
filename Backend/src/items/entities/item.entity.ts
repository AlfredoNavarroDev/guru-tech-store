import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ItemCategoria } from './item-categoria.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn({ name: 'id_item' })
  id_item: number;

  @Column({ name: 'tipo', length: 15 })
  tipo: 'producto' | 'repuesto';

  @Column({ name: 'sku', length: 50, unique: true })
  sku: string;

  @Column({ name: 'nombre', length: 255 })
  nombre: string;

  @Column({ name: 'id_marca', type: 'int', nullable: true })
  id_marca: number | null;

  @Column({ name: 'modelo', length: 100, nullable: true })
  modelo: string | null;

  @Column({ name: 'calidad', length: 30, nullable: true })
  calidad: string | null;

  @Column({ name: 'especificaciones', type: 'jsonb', nullable: true })
  especificaciones: Record<string, unknown> | null;

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

  @OneToMany(() => ItemCategoria, (ic) => ic.item, { cascade: true })
  item_categorias: ItemCategoria[];
}
