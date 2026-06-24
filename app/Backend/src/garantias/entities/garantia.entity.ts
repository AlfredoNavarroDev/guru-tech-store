import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('garantias')
export class Garantia {
  @PrimaryGeneratedColumn({ name: 'id_garantia' })
  id_garantia: number;

  @Column({ name: 'id_venta', nullable: true, type: 'int' })
  id_venta: number | null;

  @Column({ name: 'id_reparacion', nullable: true, type: 'int' })
  id_reparacion: number | null;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fecha_inicio: string;

  @Column({ name: 'fecha_fin', type: 'date' })
  fecha_fin: string;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'activa' })
  estado: 'activa' | 'vencida' | 'invalidada';

  @Column({ name: 'motivo_invalidacion', type: 'text', nullable: true })
  motivo_invalidacion: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
