import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('item_restricciones')
export class ItemRestriccion {
  @PrimaryColumn({ name: 'id_item' })
  id_item: number;

  @Column({ name: 'es_no_cambiable', default: false })
  es_no_cambiable: boolean;

  @Column({ name: 'max_dias_garantia', type: 'int', nullable: true })
  max_dias_garantia: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
