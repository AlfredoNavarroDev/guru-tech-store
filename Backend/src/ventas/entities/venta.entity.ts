import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DetalleVenta } from './detalle-venta.entity';

// Cabecera de venta directa (punto de venta). El total se deriva de SUM(detalle.importe) - descuento.
@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn({ name: 'id_venta' })
  id_venta: number;

  // La BD asigna now() → timestamp del servidor, no del cliente.
  @Column({
    name: 'fecha_emision',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fecha_emision: Date;

  // nullable: venta anónima. FK ON DELETE SET NULL.
  @Column({ name: 'id_cliente', type: 'int', nullable: true })
  id_cliente: number | null;

  // Siempre desde JWT → atribución segura al vendedor autenticado.
  @Column({ name: 'id_empleado' })
  id_empleado: number;

  // Desde JWT → vendedor solo opera en su sede asignada.
  @Column({ name: 'id_sede' })
  id_sede: number;

  // Descuento en cabecera (aplica a toda la venta, no por ítem).
  @Column({
    name: 'monto_descuento',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  monto_descuento: number;

  // 'porcentaje' | 'monto_fijo'. null si no hay descuento.
  @Column({ name: 'tipo_descuento', type: 'varchar', nullable: true })
  tipo_descuento: string | null;

  // Obligatorio si monto_descuento > 0 (validado en VentasService).
  @Column({ name: 'justificacion_descuento', type: 'text', nullable: true })
  justificacion_descuento: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;

  // cascade permite cargar detalles con findOne + relations. Insert manual en servicio.
  @OneToMany(() => DetalleVenta, (d) => d.venta, { cascade: true })
  detalles: DetalleVenta[];
}
