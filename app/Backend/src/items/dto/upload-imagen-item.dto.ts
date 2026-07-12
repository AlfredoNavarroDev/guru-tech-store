import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class UploadImagenItemDto {
  @ApiProperty({ description: 'Imagen codificada en base64' })
  @IsString()
  @MinLength(4)
  imagen_base64: string;

  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  content_type: 'image/jpeg' | 'image/png' | 'image/webp';
}
