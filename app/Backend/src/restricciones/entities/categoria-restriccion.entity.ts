import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('categoria_restricciones')
export class CategoriaRestriccion {
  @PrimaryColumn({ name: 'id_categoria' })
  id_categoria: number;

  @Column({ name: 'es_no_cambiable', default: false })
  es_no_cambiable: boolean;

  @Column({ name: 'max_dias_garantia', type: 'int', nullable: true })
  max_dias_garantia: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
