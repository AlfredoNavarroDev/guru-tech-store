import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Registra el stock de un ítem en una sede concreta; la combinación (id_sede, id_item) es única en BD.
@Entity('inventario_sedes')
export class InventarioSede {
  @PrimaryGeneratedColumn({ name: 'id_inventario' })
  id_inventario: number;

  // FK a la tabla sedes; identifica en qué sede física se encuentra el stock.
  @Column({ name: 'id_sede' })
  id_sede: number;

  @Column({ name: 'id_item' })
  id_item: number;

  // Unidades disponibles actualmente; se actualiza con ajustes de stock y movimientos.
  @Column({ name: 'cantidad_actual', type: 'int', default: 0 })
  cantidad_actual: number;

  // Umbral mínimo para alertas de reposición; valor 0 significa sin alerta.
  @Column({ name: 'stock_minimo', type: 'int', default: 0 })
  stock_minimo: number;
}
