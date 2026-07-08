import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// DTO mínimo para crear la cabecera de una compra: solo se necesita el proveedor.
export class CreateCompraDto {
  @ApiProperty({ example: 1, description: 'FK → Proveedores.id_proveedor' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_proveedor: number;
}
