import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Venta } from './venta.entity';

// Línea de detalle de venta. Precio y costo congelados al momento para reportes históricos.
@Entity('detalle_venta')
export class DetalleVenta {
  @PrimaryGeneratedColumn({ name: 'id_detalle_v' })
  id_detalle_v: number;

  // FK explícita para consultas sin cargar la relación.
  @Column({ name: 'id_venta' })
  id_venta: number;

  // Sin relación TypeORM a Item para evitar dependencia circular con Catálogo.
  @Column({ name: 'id_item' })
  id_item: number;

  @Column()
  cantidad: number;

  // Precio de venta al momento. Validado: importe == precio × cantidad.
  @Column({
    name: 'precio_unitario_momento',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  precio_unitario_momento: number;

  // Precio sin promo. null si no había. Muestra precio tachado en UI.
  @Column({
    name: 'precio_normal_momento',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  precio_normal_momento: number | null;

  // Costo de adquisición al momento. NO se expone en VentaResponseDto.
  @Column({
    name: 'costo_unitario_momento',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  costo_unitario_momento: number;

  // Precalculado para SUM directo en SQL sin multiplicar cada vez.
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  // Relación inversa a Venta. Esta entidad es dueña de la FK.
  @ManyToOne(() => Venta, (v) => v.detalles)
  @JoinColumn({ name: 'id_venta' })
  venta: Venta;
}
