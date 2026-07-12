import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class UpsertMetaRolDto {
  @ApiProperty({
    example: 2,
    description: 'ID del rol (vendedor=2, tecnico=3)',
  })
  @Type(() => Number)
  @IsInt()
  id_rol: number;

  @ApiProperty({ example: 1500.0, description: 'Monto mínimo diario en soles' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  meta_ventas_diaria: number;
}
