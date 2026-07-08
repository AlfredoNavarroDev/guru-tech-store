import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Entidad que registra cada cambio de producto: qué se devolvió, qué se entregó y diferencia cobrada.
@Entity('cambios_producto')
export class CambioProducto {
  @PrimaryGeneratedColumn({ name: 'id_cambio' })
  id_cambio: number;

  // Venta original de la que proviene el ítem devuelto.
  @Column({ name: 'id_venta_origen' })
  id_venta_origen: number;

  // Garantía vinculada al cambio; null cuando el motivo no es garantía.
  @Column({ name: 'id_garantia', type: 'int', nullable: true })
  id_garantia: number | null;

  // Vendedor que gestionó el cambio.
  @Column({ name: 'id_empleado' })
  id_empleado: number;

  // Sede donde se realizó el cambio; limita la visibilidad en consultas.
  @Column({ name: 'id_sede' })
  id_sede: number;

  @Column({ name: 'id_item_devuelto' })
  id_item_devuelto: number;

  @Column()
  cantidad: number;

  // Precio al que se valora el ítem devuelto (normalmente el precio de venta original).
  @Column({ name: 'precio_devuelto', type: 'decimal', precision: 12, scale: 2 })
  precio_devuelto: number;

  @Column({ name: 'id_item_entregado' })
  id_item_entregado: number;

  // Precio del ítem que se entrega al cliente a cambio.
  @Column({
    name: 'precio_entregado',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  precio_entregado: number;

  // Importe adicional cobrado cuando el ítem entregado es más caro que el devuelto.
  @Column({
    name: 'diferencia_cobrada',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  diferencia_cobrada: number;

  // Medio de pago usado para abonar la diferencia; null si no hay diferencia.
  @Column({
    name: 'metodo_pago_dif',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  metodo_pago_dif: string | null;

  // Código o número de operación del pago de la diferencia; null si no aplica.
  @Column({
    name: 'referencia_transaccion',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referencia_transaccion: string | null;

  // Motivo del cambio: 'defecto', 'garantia' u 'otro'.
  @Column({ type: 'varchar', length: 50 })
  motivo: string;

  // Descripción libre opcional que complementa el motivo.
  @Column({ type: 'text', nullable: true })
  detalle: string | null;

  @Column({ name: 'fecha_cambio', type: 'timestamptz', default: () => 'now()' })
  fecha_cambio: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
