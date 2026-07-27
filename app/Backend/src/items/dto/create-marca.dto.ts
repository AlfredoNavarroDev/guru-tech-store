import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMarcaDto {
  @ApiProperty({ example: 'Xiaomi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;
}
