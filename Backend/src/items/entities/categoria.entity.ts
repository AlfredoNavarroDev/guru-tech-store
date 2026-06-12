import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn({ name: 'id_categoria' })
  id_categoria: number;

  @Column({ name: 'nombre_categoria', length: 100, unique: true })
  nombre_categoria: string;
}
