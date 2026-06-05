import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * @purpose Entidad de boleta (comprobante fiscal).
 * Vinculada a venta O reparación (XOR), nunca ambas. No se elimina ni modifica.
 */
@Entity('boletas')
export class Boleta {
  @PrimaryGeneratedColumn({ name: 'id_boleta' })
  id_boleta: number;

  /** B{sede}-{secuencial}. unique → no duplicados en BD. */
  @Column({ length: 20, unique: true })
  numero: string;

  /** BD asigna now() → evita manipulación de fecha. */
  @Column({
    name: 'fecha_emision',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fecha_emision: Date;

  /** Venta origen. null si es boleta de reparación. */
  @Column({ name: 'id_venta', type: 'int', nullable: true })
  id_venta: number | null;

  /** Reparación origen (Sprint futuro). En Sprint 1 siempre null. */
  @Column({ name: 'id_reparacion', type: 'int', nullable: true })
  id_reparacion: number | null;

  /** Total final post-descuento. precision 12,2 → hasta 9,999,999,999.99. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  /** 'emitida' (Sprint 1). Futuro: 'anulada', 'rectificada'. */
  @Column({ default: 'emitida', length: 20 })
  estado: string;

  /** URL pública del PDF en R2. null hasta que se sube exitosamente. */
  @Column({ name: 'url_pdf', type: 'varchar', nullable: true, length: 500 })
  url_pdf: string | null;
}
