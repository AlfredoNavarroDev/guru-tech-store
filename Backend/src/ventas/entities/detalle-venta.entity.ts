import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Venta } from './venta.entity';

@Entity('detalle_venta')
export class DetalleVenta {
  @PrimaryGeneratedColumn({ name: 'id_detalle_v' })
  id_detalle_v: number;

  @Column({ name: 'id_venta' })
  id_venta: number;

  @Column({ name: 'id_item' })
  id_item: number;

  @Column()
  cantidad: number;

  @Column({
    name: 'precio_unitario_momento',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  precio_unitario_momento: number;

  @Column({
    name: 'costo_unitario_momento',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  costo_unitario_momento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Venta, (v) => v.detalles)
  @JoinColumn({ name: 'id_venta' })
  venta: Venta;
}
