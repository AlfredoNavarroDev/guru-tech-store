import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn({ name: 'id_pago' })
  id_pago: number;

  @Column({ name: 'id_venta', nullable: true })
  id_venta: number | null;

  @Column({ name: 'id_reparacion', nullable: true })
  id_reparacion: number | null;

  @Column({ name: 'metodo_pago' })
  metodo_pago: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ name: 'es_adelanto', default: false })
  es_adelanto: boolean;

  @Column({ name: 'fecha_pago', type: 'timestamptz', default: () => 'now()' })
  fecha_pago: Date;

  @Column({ name: 'referencia_transaccion', nullable: true, length: 100 })
  referencia_transaccion: string | null;
}
