import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryEmpleadosDto extends PaginationDto {
  @ApiPropertyOptional({ example: 3, description: 'Filtrar por id_rol' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_rol?: number;

  @ApiPropertyOptional({ example: true, description: 'Filtrar por estado activo/inactivo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo?: boolean;
}
