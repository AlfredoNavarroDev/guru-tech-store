import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Entidad de catálogo: define los roles posibles (propietario, vendedor, técnico…).
@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  id_rol: number;

  // Nombre legible usado en guards (@Roles) y en el JWT payload.
  @Column({ name: 'nombre_rol', length: 80 })
  nombre_rol: string;
}
