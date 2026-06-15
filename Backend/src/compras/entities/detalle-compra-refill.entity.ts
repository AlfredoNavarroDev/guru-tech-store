import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompraRefill } from './compra-refill.entity';

@Entity('detalle_compra_refill')
export class DetalleCompraRefill {
  @PrimaryGeneratedColumn({ name: 'id_detalle' })
  id_detalle_compra: number;

  @Column({ name: 'id_compra' })
  id_compra: number;

  @Column({ name: 'id_item' })
  id_item: number;

  @Column({ name: 'cantidad_comprada', type: 'int' })
  cantidad_comprada: number;

  @Column({ name: 'costo_unidad', type: 'decimal', precision: 12, scale: 2 })
  costo_unidad: number;

  @Column({
    name: 'precio_venta_sugerido',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  precio_venta_sugerido: number;

  @ManyToOne(() => CompraRefill, (c) => c.detalles)
  @JoinColumn({ name: 'id_compra' })
  compra: CompraRefill;
}
