import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('empleados')
export class Empleado {
  @PrimaryGeneratedColumn({ name: 'id_empleado' })
  id_empleado: number;

  @Column({ name: 'id_sede', type: 'int', nullable: true })
  id_sede: number | null;

  @Column({ name: 'id_rol', type: 'int' })
  id_rol: number;

  @Column({ name: 'tipo_documento' })
  tipo_documento: string;

  @Column({ name: 'nro_documento' })
  nro_documento: string;

  @Column({ name: 'nombre_completo' })
  nombre_completo: string;

  @Column({ name: 'password_hash' })
  password_hash: string;

  @Column({ name: 'estado', default: 'activo' })
  estado: string;

  @Column({ name: 'telefono', nullable: true })
  telefono: string | null;

  @Column({ name: 'sueldo_semanal_soles', type: 'decimal', precision: 10, scale: 2, nullable: true })
  sueldo_semanal_soles: number | null;

  @Column({ name: 'es_extranjero', type: 'boolean', default: false })
  es_extranjero: boolean;

  @Column({ name: 'direccion_completa', type: 'text', nullable: true })
  direccion_completa: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  created_by: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
