import { IsDateString, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

// DTO para crear una garantía asociada a una reparación existente.
export class CreateGarantiaReparacionDto {
  // ID de la reparación a garantizar; debe pertenecer a la sede del técnico autenticado.
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_reparacion: number;

  @IsDateString()
  fecha_inicio: string;

  // Debe ser estrictamente posterior a fecha_inicio (validado en el servicio).
  @IsDateString()
  fecha_fin: string;
}
