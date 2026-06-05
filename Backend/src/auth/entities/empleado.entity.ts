import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Entidad de empleado para autenticación. Vinculado a una sede para filtrado multi-sede vía JWT.
@Entity('empleados')
export class Empleado {
  @PrimaryGeneratedColumn({ name: 'id_empleado' })
  id_empleado: number;

  // Nullable para admin global sin sede.
  @Column({ name: 'id_sede', type: 'int', nullable: true })
  id_sede: number | null;

  // DNI, CE, pasaporte, etc.
  @Column({ name: 'tipo_documento' })
  tipo_documento: string;

  // Identificador de login (único en BD).
  @Column({ name: 'nro_documento' })
  nro_documento: string;

  @Column({ name: 'nombre_completo' })
  nombre_completo: string;

  // bcrypt.hash(password, 10). Nunca se devuelve al cliente.
  @Column({ name: 'password_hash' })
  password_hash: string;

  // 'activo' | 'inactivo'. Desactivar preserva historial de ventas.
  @Column({ name: 'estado', default: 'activo' })
  estado: string;
}
