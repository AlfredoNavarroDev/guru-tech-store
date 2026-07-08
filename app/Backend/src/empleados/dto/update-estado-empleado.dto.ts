import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

// DTO para cambiar el estado de un empleado. Al pasar false se revocan sus tokens (HU-24).
export class UpdateEstadoEmpleadoDto {
  @ApiProperty({
    example: true,
    description: 'true = activo, false = inactivo',
  })
  @IsBoolean()
  activo: boolean;
}
