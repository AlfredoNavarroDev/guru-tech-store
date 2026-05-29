import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('boletas')
export class Boleta {
  @PrimaryGeneratedColumn({ name: 'id_boleta' })
  id_boleta: number;

  @Column({ length: 20, unique: true })
  numero: string;

  @Column({
    name: 'fecha_emision',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fecha_emision: Date;

  @Column({ name: 'id_venta', nullable: true })
  id_venta: number | null;

  @Column({ name: 'id_reparacion', nullable: true })
  id_reparacion: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ default: 'emitida', length: 20 })
  estado: string;

  @Column({ name: 'url_pdf', nullable: true, length: 500 })
  url_pdf: string | null;
}
