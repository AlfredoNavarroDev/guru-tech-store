import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TopProductoDto {
  @Expose()
  @ApiProperty({ example: 12 })
  id_item: number;

  @Expose()
  @ApiProperty({ example: 'Cable USB-C 2m' })
  nombre: string;

  @Expose()
  @ApiProperty({ example: 'ACC-001' })
  sku: string;

  @Expose()
  @ApiProperty({ example: 47 })
  unidades: number;

  @Expose()
  @ApiProperty({ example: 940.0 })
  ingresos: number;

  @Expose()
  @ApiProperty({ example: 100 })
  pct: number;

  @Expose()
  @ApiProperty({ example: 'Sede Norte', nullable: true })
  sede_nombre: string | null;
}
