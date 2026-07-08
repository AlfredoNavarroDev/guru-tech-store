import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Mapea la tabla 'proveedores' de la base de datos.
@Entity('proveedores')
export class Proveedor {
  // Clave primaria autoincremental.
  @PrimaryGeneratedColumn({ name: 'id_proveedor' })
  id_proveedor: number;

  // RUC único del proveedor (peruano de 11 dígitos o extranjero hasta 15).
  @Column({ name: 'ruc', length: 15, unique: true })
  ruc: string;

  @Column({ name: 'razon_social', length: 255 })
  razon_social: string;

  // Nombre de la persona de contacto; puede ser nulo si no se conoce.
  @Column('varchar', { name: 'contacto_nombre', length: 150, nullable: true })
  contacto_nombre: string | null;

  @Column('varchar', { name: 'telefono', length: 20, nullable: true })
  telefono: string | null;

  // Fecha de alta gestionada automáticamente por TypeORM.
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  // Fecha de última modificación; null hasta que se realice la primera actualización.
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;
}
