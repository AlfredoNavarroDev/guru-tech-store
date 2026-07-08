import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Estructura de la respuesta pública del proveedor (sin datos internos de BD).
export class ProveedorResponseDto {
  @ApiProperty() id_proveedor: number;
  @ApiProperty() ruc: string;
  @ApiProperty() razon_social: string;
  // Campos opcionales: pueden ser null si no se registraron al crear.
  @ApiPropertyOptional() contacto_nombre: string | null;
  @ApiPropertyOptional() telefono: string | null;
  @ApiProperty() created_at: Date;
  @ApiPropertyOptional() updated_at: Date | null;
}
