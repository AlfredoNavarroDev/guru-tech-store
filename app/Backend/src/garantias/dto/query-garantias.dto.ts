import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryGarantiasDto extends PaginationDto {
  @IsOptional()
  @IsIn(['activa', 'vencida', 'invalidada'])
  estado?: 'activa' | 'vencida' | 'invalidada';
}
