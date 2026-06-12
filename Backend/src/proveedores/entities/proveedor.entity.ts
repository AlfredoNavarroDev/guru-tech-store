import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'ruc', length: 15, unique: true })
  ruc: string;

  @Column({ name: 'razon_social', length: 255 })
  razon_social: string;

  @Column({ name: 'contacto_nombre', length: 150, nullable: true })
  contacto_nombre: string | null;

  @Column({ name: 'telefono', length: 20, nullable: true })
  telefono: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;
}
