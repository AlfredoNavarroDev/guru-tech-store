import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('marcas')
export class Marca {
  @PrimaryGeneratedColumn({ name: 'id_marca' })
  id_marca: number;

  @Column({ name: 'nombre', length: 100, unique: true })
  nombre: string;
}
