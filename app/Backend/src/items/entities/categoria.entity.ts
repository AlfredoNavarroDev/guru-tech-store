import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Entidad de catálogo de categorías; cada categoría tiene nombre único y se asocia a ítems mediante item_categorias.
@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn({ name: 'id_categoria' })
  id_categoria: number;

  // Nombre descriptivo de la categoría; la restricción unique evita duplicados en BD.
  @Column({ name: 'nombre_categoria', length: 100, unique: true })
  nombre_categoria: string;
}
