import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProveedorResponseDto {
  @ApiProperty() id_proveedor: number;
  @ApiProperty() ruc: string;
  @ApiProperty() razon_social: string;
  @ApiPropertyOptional() contacto_nombre: string | null;
  @ApiPropertyOptional() telefono: string | null;
  @ApiProperty() created_at: Date;
  @ApiPropertyOptional() updated_at: Date | null;
}
