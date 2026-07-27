import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Accesorios' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre_categoria: string;
}
