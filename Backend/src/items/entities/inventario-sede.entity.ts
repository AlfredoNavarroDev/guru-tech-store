import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inventario_sedes')
export class InventarioSede {
  @PrimaryGeneratedColumn({ name: 'id_inventario' })
  id_inventario: number;

  @Column({ name: 'id_sede' })
  id_sede: number;

  @Column({ name: 'id_item' })
  id_item: number;

  @Column({ name: 'cantidad_actual', type: 'int', default: 0 })
  cantidad_actual: number;

  @Column({ name: 'stock_minimo', type: 'int', default: 0 })
  stock_minimo: number;
}
