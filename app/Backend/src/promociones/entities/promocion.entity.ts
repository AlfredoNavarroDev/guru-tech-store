import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('promociones')
export class Promocion {
  @PrimaryGeneratedColumn({ name: 'id_promocion' })
  id_promocion: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ name: 'id_sede', type: 'int', nullable: true })
  id_sede: number | null;

  @Column({ name: 'id_item_afectado', type: 'int', nullable: true })
  id_item_afectado: number | null;

  @Column({ name: 'id_categoria_afectada', type: 'int', nullable: true })
  id_categoria_afectada: number | null;

  @Column({ name: 'valor_descuento', type: 'decimal', precision: 12, scale: 2 })
  valor_descuento: number;

  @Column({ name: 'tipo_descuento', length: 20 })
  tipo_descuento: 'porcentaje' | 'monto_fijo';

  @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
  fecha_inicio: string | null;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fecha_fin: string | null;

  @Column({ name: 'dia_semana', type: 'int', nullable: true })
  dia_semana: number | null;

  @Column({ length: 20, default: 'activa' })
  estado: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
