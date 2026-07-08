import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Entidad que representa una garantía. Puede estar asociada a una venta o a una reparación (XOR).
@Entity('garantias')
export class Garantia {
  @PrimaryGeneratedColumn({ name: 'id_garantia' })
  id_garantia: number;

  // null si la garantía corresponde a una reparación.
  @Column({ name: 'id_venta', nullable: true, type: 'int' })
  id_venta: number | null;

  // null si la garantía corresponde a una venta.
  @Column({ name: 'id_reparacion', nullable: true, type: 'int' })
  id_reparacion: number | null;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fecha_inicio: string;

  // Fecha de expiración; el servicio cambia el estado a 'vencida' cuando se supera.
  @Column({ name: 'fecha_fin', type: 'date' })
  fecha_fin: string;

  // Estado del ciclo de vida: activa → vencida (expiró) o invalidada (reclamada/anulada).
  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'activa' })
  estado: 'activa' | 'vencida' | 'invalidada';

  // Solo se rellena cuando el estado es 'invalidada'; explica la causa.
  @Column({ name: 'motivo_invalidacion', type: 'text', nullable: true })
  motivo_invalidacion: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
