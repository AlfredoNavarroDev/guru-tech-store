import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ComprasQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtrar por nombre de proveedor (ILIKE)',
  })
  @IsOptional()
  @IsString()
  proveedor?: string;
}
