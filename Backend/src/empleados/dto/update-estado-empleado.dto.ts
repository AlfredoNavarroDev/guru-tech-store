import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateEstadoEmpleadoDto {
  @ApiProperty({ example: true, description: 'true = activo, false = inactivo' })
  @IsBoolean()
  activo: boolean;
}
