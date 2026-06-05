import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * @purpose Entidad de pago. Diseño polimórfico XOR: id_venta o id_reparacion.
 * Adelantos solo en reparaciones (chk_adelanto_solo_reparacion en BD).
 */
@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn({ name: 'id_pago' })
  id_pago: number;

  /** XOR: null si el pago es de reparación. */
  @Column({ name: 'id_venta', type: 'int', nullable: true })
  id_venta: number | null;

  /** XOR: null si el pago es de venta. */
  @Column({ name: 'id_reparacion', type: 'int', nullable: true })
  id_reparacion: number | null;

  /** Validado en DTO y CHECK constraint de BD. */
  @Column({ name: 'metodo_pago' })
  metodo_pago: string;

  /** precision 12,2 → hasta 9,999,999,999.99. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  /** false en ventas; true solo en adelantos de reparación. */
  @Column({ name: 'es_adelanto', default: false })
  es_adelanto: boolean;

  /** BD asigna now() → trazabilidad independiente del reloj del cliente. */
  @Column({ name: 'fecha_pago', type: 'timestamptz', default: () => 'now()' })
  fecha_pago: Date;

  /** Nro de operación/voucher. null en efectivo. */
  @Column({
    name: 'referencia_transaccion',
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  referencia_transaccion: string | null;
}
