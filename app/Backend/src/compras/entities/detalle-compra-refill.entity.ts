import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompraRefill } from './compra-refill.entity';

// Línea de ítem dentro de una orden de compra: qué se compró, cuánto y a qué precio.
@Entity('detalle_compra_refill')
export class DetalleCompraRefill {
  @PrimaryGeneratedColumn({ name: 'id_detalle' })
  id_detalle_compra: number;

  // FK a la cabecera de la compra.
  @Column({ name: 'id_compra' })
  id_compra: number;

  // FK al catálogo de ítems.
  @Column({ name: 'id_item' })
  id_item: number;

  @Column({ name: 'cantidad_comprada', type: 'int' })
  cantidad_comprada: number;

  // Precio de costo pagado al proveedor por unidad.
  @Column({ name: 'costo_unidad', type: 'decimal', precision: 12, scale: 2 })
  costo_unidad: number;

  // Precio de venta recomendado derivado de esta compra; orientativo para el sistema.
  @Column({
    name: 'precio_venta_sugerido',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  precio_venta_sugerido: number;

  // Relación inversa hacia la cabecera de compra.
  @ManyToOne(() => CompraRefill, (c) => c.detalles)
  @JoinColumn({ name: 'id_compra' })
  compra: CompraRefill;
}
