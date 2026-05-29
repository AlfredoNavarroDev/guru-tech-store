import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  id_cliente: number;

  @Column({ name: 'tipo_documento' })
  tipo_documento: string;

  @Column({ name: 'nro_documento' })
  nro_documento: string;

  @Column({ name: 'nombre_completo' })
  nombre_completo: string;

  @Column({ nullable: true })
  telefono: string | null;

  @Column({ name: 'direccion_completa', nullable: true, type: 'text' })
  direccion_completa: string | null;

  @Column({ name: 'es_extranjero', nullable: true, default: false })
  es_extranjero: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;
}
