import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class EmpleadoResponseDto {
  @Expose()
  @ApiProperty({ example: 5 })
  id_empleado: number;

  @Expose()
  @ApiProperty({ example: 2 })
  id_sede: number;

  @Expose()
  @ApiProperty({ example: 3 })
  id_rol: number;

  @Expose()
  @ApiPropertyOptional({ example: 'vendedor' })
  rol_nombre?: string;

  @Expose()
  @ApiProperty({ example: 'DNI' })
  tipo_documento: string;

  @Expose()
  @ApiProperty({ example: '12345678' })
  nro_documento: string;

  @Expose()
  @ApiProperty({ example: 'Juan Pérez García' })
  nombre_completo: string;

  @Expose()
  @ApiPropertyOptional({ example: '987654321', nullable: true })
  telefono: string | null;

  @Expose()
  @ApiProperty({ example: 'activo' })
  estado: string;

  @Expose()
  @ApiPropertyOptional({ example: 1200.00, nullable: true })
  sueldo_semanal_soles: number | null;

  @Expose()
  @ApiProperty({ example: false })
  es_extranjero: boolean;

  @Expose()
  @ApiPropertyOptional({ example: 'Av. Lima 123', nullable: true })
  direccion_completa: string | null;

  @Expose()
  @ApiProperty()
  created_at: Date;
}
