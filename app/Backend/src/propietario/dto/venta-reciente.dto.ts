import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class VentaRecienteDto {
  @Expose()
  @ApiProperty({ example: 1041 })
  id_venta: number;

  @Expose()
  @ApiProperty({ example: '11:42' })
  hora: string;

  @Expose()
  @ApiProperty({ example: 'Carlos Mendoza', nullable: true })
  cliente: string | null;

  @Expose()
  @ApiProperty({ example: 'Ana Torres' })
  vendedor: string;

  @Expose()
  @ApiProperty({ example: 380.0 })
  total: number;
}
