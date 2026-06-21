import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DetalleCompraRefill } from './detalle-compra-refill.entity';

@Entity('compras_refill')
export class CompraRefill {
  @PrimaryGeneratedColumn({ name: 'id_compra' })
  id_compra: number;

  @Column({ name: 'id_empleado_refiller' })
  id_empleado_refiller: number;

  @Column({ name: 'id_sede_destino' })
  id_sede_destino: number;

  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'fecha_compra', type: 'timestamptz', default: () => 'now()' })
  fecha_compra: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;

  @OneToMany(() => DetalleCompraRefill, (d) => d.compra, { cascade: true })
  detalles: DetalleCompraRefill[];
}
