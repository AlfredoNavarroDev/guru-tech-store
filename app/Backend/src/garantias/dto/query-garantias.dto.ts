import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Parámetros de consulta para listar garantías; extiende la paginación base.
export class QueryGarantiasDto extends PaginationDto {
  // Filtra por estado del ciclo de vida de la garantía.
  @IsOptional()
  @IsIn(['activa', 'vencida', 'invalidada'])
  estado?: 'activa' | 'vencida' | 'invalidada';

  // Permite al técnico obtener la garantía de una reparación concreta.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_reparacion?: number;
}
