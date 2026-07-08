import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Entidad que mapea la tabla 'empleados'. Usada solo en AuthModule para autenticación.
@Entity('empleados')
export class Empleado {
  @PrimaryGeneratedColumn({ name: 'id_empleado' })
  id_empleado: number;

  // Null para el propietario, que no está asignado a ninguna sede.
  @Column({ name: 'id_sede', type: 'int', nullable: true })
  id_sede: number | null;

  @Column({ name: 'id_rol', type: 'int' })
  id_rol: number;

  @Column({ name: 'tipo_documento' })
  tipo_documento: string;

  // Identificador de login (DNI, CE, etc.), único en la tabla.
  @Column({ name: 'nro_documento' })
  nro_documento: string;

  @Column({ name: 'nombre_completo' })
  nombre_completo: string;

  // Contraseña almacenada como hash bcrypt, nunca en texto claro.
  @Column({ name: 'password_hash' })
  password_hash: string;

  // 'activo' | 'inactivo' — empleados inactivos no pueden iniciar sesión.
  @Column({ name: 'estado', default: 'activo' })
  estado: string;

  @Column({ name: 'telefono', type: 'varchar', nullable: true, length: 20 })
  telefono: string | null;

  @Column({
    name: 'sueldo_soles',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  sueldo_soles: number | null;

  @Column('varchar', { name: 'frecuencia_pago', default: 'semanal' })
  frecuencia_pago: 'semanal' | 'quincenal' | 'mensual';

  @Column({ name: 'es_extranjero', type: 'boolean', default: false })
  es_extranjero: boolean;

  @Column({ name: 'direccion_completa', type: 'text', nullable: true })
  direccion_completa: string | null;

  // Auditoría: id_empleado que registró al nuevo empleado.
  @Column({ name: 'created_by', type: 'int', nullable: true })
  created_by: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
