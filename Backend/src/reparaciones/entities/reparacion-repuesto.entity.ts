import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reparacion } from './reparacion.entity';

@Entity('reparacion_repuestos_usados')
export class ReparacionRepuesto {
  @PrimaryGeneratedColumn({ name: 'id_repuesto_u' })
  id_repuesto_u: number;

  @Column({ name: 'id_reparacion' })
  id_reparacion: number;

  @Column({ name: 'id_item' })
  id_item: number;

  @Column({ name: 'cantidad' })
  cantidad: number;

  @Column({ name: 'precio_cobrado', type: 'decimal', precision: 12, scale: 2 })
  precio_cobrado: number;

  @Column({
    name: 'costo_unitario_momento',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  costo_unitario_momento: number;

  @ManyToOne(() => Reparacion, (r) => r.repuestos)
  @JoinColumn({ name: 'id_reparacion' })
  reparacion: Reparacion;
}
