import { IsIn, IsString, MinLength } from 'class-validator';

// DTO para subir una foto de etapa del servicio técnico (RF-26). La imagen viaja en base64 para evitar multipart.
export class UploadFotoReparacionDto {
  // Imagen codificada en base64; se decodifica a Buffer antes de enviarse a R2.
  @IsString()
  @MinLength(4)
  imagen_base64: string;

  // Determina la extensión del archivo generado y el ContentType enviado a R2.
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  content_type: string;

  // Nombre de la etapa (ej. 'diagnóstico', 'reparado'); se normaliza a slug para la clave de R2.
  @IsString()
  @MinLength(1)
  estado: string;
}
