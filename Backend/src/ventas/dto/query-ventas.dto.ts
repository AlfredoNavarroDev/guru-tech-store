import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Query params para historial de ventas (HU-08). Extiende paginación. Todos los filtros son opcionales.
export class QueryVentasDto extends PaginationDto {
  // Formato ISO 8601 (YYYY-MM-DD). El servicio agrega ' 23:59:59' para rango inclusivo.
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  // Subconsulta sobre Ventas usando el índice idx_ventas_cliente.
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_cliente?: number;

  @ApiPropertyOptional({ example: 'García' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre_cliente?: string;
}
