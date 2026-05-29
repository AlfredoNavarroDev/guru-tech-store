import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('empleados')
export class Empleado {
  @PrimaryGeneratedColumn({ name: 'id_empleado' })
  id_empleado: number;

  @Column({ name: 'id_sede', nullable: true })
  id_sede: number | null;

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
}
