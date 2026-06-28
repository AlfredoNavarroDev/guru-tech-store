import { IsIn, IsString, MinLength } from 'class-validator';

export class UploadFotoReparacionDto {
  @IsString()
  @MinLength(4)
  imagen_base64: string;

  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  content_type: string;

  @IsString()
  @MinLength(1)
  estado: string;
}
