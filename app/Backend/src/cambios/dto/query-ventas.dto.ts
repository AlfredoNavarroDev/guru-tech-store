import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

// Filtro de fecha para el selector de ventas del flujo de cambio; devuelve máx 20 resultados.
export class QueryVentasDto {
  // Cuando se proporciona, filtra ventas del día exacto indicado (rango 00:00 – 23:59:59).
  @ApiPropertyOptional({ example: '2026-06-23' })
  @IsOptional()
  @IsDateString()
  fecha?: string;
}
