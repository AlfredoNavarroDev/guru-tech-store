import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RendimientoHoyDto {
  @ApiProperty() total_hoy: number;
  @ApiPropertyOptional() meta_diaria: number | null;
  @ApiPropertyOptional() porcentaje: number | null;
}
