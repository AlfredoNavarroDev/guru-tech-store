import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * @purpose Entidad de cliente. No se elimina (sin soft-delete)
 * → preserva relaciones con Ventas históricas.
 */
@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  id_cliente: number;

  /** DNI | CE | pasaporte. Validado en DTO, no aquí. */
  @Column({ name: 'tipo_documento' })
  tipo_documento: string;

  /** Único junto con tipo_documento. Unicidad compuesta en servicio. */
  @Column({ name: 'nro_documento' })
  nro_documento: string;

  @Column({ name: 'nombre_completo' })
  nombre_completo: string;

  /** Opcional: no todos los clientes dan teléfono. */
  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  /** Opcional. tipo 'text' → sin límite de longitud. */
  @Column({ name: 'direccion_completa', nullable: true, type: 'text' })
  direccion_completa: string | null;

  /** true si tipo_documento ≠ DNI. Reportes SUNAT para no domiciliados. */
  @Column({ name: 'es_extranjero', nullable: true, default: false })
  es_extranjero: boolean;

  /** timestamptz → correcto independientemente del huso horario. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  /** null hasta la primera modificación. */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;
}
