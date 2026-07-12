import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReparacionRepuesto } from './reparacion-repuesto.entity';

// Entidad principal de la tabla `reparaciones`. Registra el ciclo de vida completo de un equipo en servicio técnico.
@Entity('reparaciones')
export class Reparacion {
  @PrimaryGeneratedColumn({ name: 'id_reparacion' })
  id_reparacion: number;

  // Se establece automáticamente con now() al insertar el registro.
  @Column({
    name: 'fecha_ingreso',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fecha_ingreso: Date;

  @Column({ name: 'id_cliente' })
  id_cliente: number;

  // Técnico responsable: se asigna desde el JWT del usuario autenticado.
  @Column({ name: 'id_tecnico' })
  id_tecnico: number;

  @Column({ name: 'id_sede' })
  id_sede: number;

  @Column({ name: 'marca', type: 'varchar', length: 50, nullable: true })
  marca: string | null;

  @Column({ name: 'modelo', type: 'varchar', length: 50, nullable: true })
  modelo: string | null;

  // IMEI del dispositivo; máximo 15 dígitos según estándar GSM.
  @Column({ name: 'imei', type: 'varchar', length: 15, nullable: true })
  imei: string | null;

  @Column({ name: 'esta_encendido', type: 'boolean', nullable: true })
  esta_encendido: boolean | null;

  // Checklist de estado físico del equipo en formato JSONB libre (p.ej. pantalla, batería, cámara).
  @Column({ name: 'checklist_estado', type: 'jsonb', nullable: true })
  checklist_estado: Record<string, unknown> | null;

  @Column({ name: 'diagnostico_tecnico', type: 'text', nullable: true })
  diagnostico_tecnico: string | null;

  // FK a `estados_reparacion`; determina si el registro es de solo lectura (estado final).
  @Column({ name: 'id_estado' })
  id_estado: number;

  @Column({ name: 'fecha_estimada', type: 'date', nullable: true })
  fecha_estimada: string | null;

  // Se rellena automáticamente cuando se transiciona a un estado marcado como final.
  @Column({ name: 'fecha_terminado', type: 'timestamptz', nullable: true })
  fecha_terminado: Date | null;

  // Se rellena cuando el estado cambia a 'entregado'.
  @Column({
    name: 'fecha_entrega_cliente',
    type: 'timestamptz',
    nullable: true,
  })
  fecha_entrega_cliente: Date | null;

  // Mano de obra cotizada; los repuestos se suman aparte para calcular el total.
  @Column({
    name: 'monto_cotizado',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  monto_cotizado: number | null;

  @Column({
    name: 'monto_descuento',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  monto_descuento: number;

  // 'porcentaje' aplica descuento relativo; 'monto_fijo' lo aplica en valor absoluto.
  @Column({
    name: 'tipo_descuento',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  tipo_descuento: string | null;

  @Column({ name: 'justificacion_descuento', type: 'text', nullable: true })
  justificacion_descuento: string | null;

  @Column({
    name: 'tipo_servicio',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  tipo_servicio: 'software' | 'hardware' | 'mixto' | null;

  @Column({
    name: 'tipo_accion',
    type: 'varchar',
    length: 20,
    default: 'reparacion',
  })
  tipo_accion: 'diagnostico' | 'reparacion';

  // Array JSONB de fotos subidas a R2 por etapa del servicio técnico.
  @Column({ name: 'fotos', type: 'jsonb', nullable: true })
  fotos: { url: string; etapa: string; created_at: string }[] | null;

  // Si no es null, esta reparación es un reclamo de garantía de otra anterior.
  @Column({ name: 'id_garantia_reclamada', nullable: true, type: 'int' })
  id_garantia_reclamada: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;

  // Relación con los repuestos consumidos en esta reparación.
  @OneToMany(() => ReparacionRepuesto, (r) => r.reparacion)
  repuestos: ReparacionRepuesto[];
}
