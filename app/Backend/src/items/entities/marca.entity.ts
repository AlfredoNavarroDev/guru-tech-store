import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Entidad de catálogo de marcas; se referencia desde items.id_marca como FK opcional.
@Entity('marcas')
export class Marca {
  @PrimaryGeneratedColumn({ name: 'id_marca' })
  id_marca: number;

  // Nombre de la marca; la restricción unique impide registros duplicados.
  @Column({ name: 'nombre', length: 100, unique: true })
  nombre: string;
}
