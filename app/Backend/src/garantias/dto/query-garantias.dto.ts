import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryGarantiasDto extends PaginationDto {
  @IsOptional()
  @IsIn(['activa', 'vencida', 'invalidada'])
  estado?: 'activa' | 'vencida' | 'invalidada';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_reparacion?: number;
}
