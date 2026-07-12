import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class EmpleadoRendimientoDto {
  @Expose()
  @ApiProperty({ example: 5 })
  id_empleado: number;

  @Expose()
  @ApiProperty({ example: 'Ana Torres' })
  nombre_completo: string;

  @Expose()
  @ApiProperty({ example: 'vendedor', enum: ['vendedor', 'tecnico'] })
  rol_nombre: 'vendedor' | 'tecnico';

  @Expose()
  @ApiProperty({ example: 890.0 })
  ingresos_hoy: number;

  @Expose()
  @ApiProperty({ example: 1240.0 })
  ingresos_mejor_dia_mes: number;

  @Expose()
  @ApiPropertyOptional({ example: '2026-07-05', nullable: true })
  fecha_mejor_dia_mes: string | null;
}
