import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Entidad de cliente. No se elimina para preservar relaciones con ventas históricas.
@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  id_cliente: number;

  // DNI | CE | pasaporte. Validado en el DTO.
  @Column({ name: 'tipo_documento' })
  tipo_documento: string;

  // Único junto con tipo_documento (unicidad compuesta validada en servicio).
  @Column({ name: 'nro_documento' })
  nro_documento: string;

  @Column({ name: 'nombre_completo' })
  nombre_completo: string;

  // Opcional. No todos los clientes proporcionan teléfono.
  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  // Dirección opcional. Tipo text sin límite de longitud.
  @Column({ name: 'direccion_completa', nullable: true, type: 'text' })
  direccion_completa: string | null;

  // true si tipo_documento ≠ DNI. Útil para reportes SUNAT de no domiciliados.
  @Column({ name: 'es_extranjero', nullable: true, default: false })
  es_extranjero: boolean;

  // timestamptz para manejo correcto de husos horarios.
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  // null hasta la primera modificación.
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;
}
