import { IsDateString, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGarantiaReparacionDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_reparacion: number;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;
}
