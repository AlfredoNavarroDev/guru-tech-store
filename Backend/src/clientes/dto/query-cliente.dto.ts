import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Filtros de búsqueda de clientes. search busca tanto en nombre como en documento.
export class QueryClienteDto {
  @ApiPropertyOptional({
    description:
      'Buscar por nombre o número de documento (parcial, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Buscar por nombre (parcial)' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Buscar por número de documento (parcial)',
  })
  @IsOptional()
  @IsString()
  nro_documento?: string;
}
