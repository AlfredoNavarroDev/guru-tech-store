import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DetalleVenta } from './detalle-venta.entity';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn({ name: 'id_venta' })
  id_venta: number;

  @Column({
    name: 'fecha_emision',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fecha_emision: Date;

  @Column({ name: 'id_cliente', nullable: true })
  id_cliente: number | null;

  @Column({ name: 'id_empleado' })
  id_empleado: number;

  @Column({ name: 'id_sede' })
  id_sede: number;

  @Column({
    name: 'monto_descuento',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  monto_descuento: number;

  @Column({ name: 'tipo_descuento', nullable: true })
  tipo_descuento: string | null;

  @Column({ name: 'justificacion_descuento', type: 'text', nullable: true })
  justificacion_descuento: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;

  @OneToMany(() => DetalleVenta, (d) => d.venta, { cascade: true })
  detalles: DetalleVenta[];
}
