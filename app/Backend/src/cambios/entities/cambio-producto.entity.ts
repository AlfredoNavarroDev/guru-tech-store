import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('cambios_producto')
export class CambioProducto {
  @PrimaryGeneratedColumn({ name: 'id_cambio' })
  id_cambio: number;

  @Column({ name: 'id_venta_origen' })
  id_venta_origen: number;

  @Column({ name: 'id_garantia', type: 'int', nullable: true })
  id_garantia: number | null;

  @Column({ name: 'id_empleado' })
  id_empleado: number;

  @Column({ name: 'id_sede' })
  id_sede: number;

  @Column({ name: 'id_item_devuelto' })
  id_item_devuelto: number;

  @Column()
  cantidad: number;

  @Column({ name: 'precio_devuelto', type: 'decimal', precision: 12, scale: 2 })
  precio_devuelto: number;

  @Column({ name: 'id_item_entregado' })
  id_item_entregado: number;

  @Column({
    name: 'precio_entregado',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  precio_entregado: number;

  @Column({
    name: 'diferencia_cobrada',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  diferencia_cobrada: number;

  @Column({
    name: 'metodo_pago_dif',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  metodo_pago_dif: string | null;

  @Column({
    name: 'referencia_transaccion',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referencia_transaccion: string | null;

  @Column({ type: 'varchar', length: 50 })
  motivo: string;

  @Column({ type: 'text', nullable: true })
  detalle: string | null;

  @Column({ name: 'fecha_cambio', type: 'timestamptz', default: () => 'now()' })
  fecha_cambio: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
