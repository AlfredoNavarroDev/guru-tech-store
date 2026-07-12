import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

// DTO de respuesta del empleado. @Exclude oculta todos los campos por defecto; @Expose los selecciona explícitamente.
// Garantiza que password_hash nunca llegue al cliente aunque se olvide eliminarlo en el servicio.
@Exclude()
export class EmpleadoResponseDto {
  @Expose()
  @ApiProperty({ example: 5 })
  id_empleado: number;

  @Expose()
  @ApiProperty({ example: 2 })
  id_sede: number;

  @Expose()
  @ApiPropertyOptional({ example: 'Lima Centro' })
  sede_nombre?: string;

  @Expose()
  @ApiProperty({ example: 3 })
  id_rol: number;

  // Nombre del rol desnormalizado para evitar un join extra en el frontend.
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

  // 'activo' | 'inactivo'. Se usa string en lugar de enum para flexibilidad futura.
  @Expose()
  @ApiProperty({ example: 'activo' })
  estado: string;

  @Expose()
  @ApiPropertyOptional({ example: 1200.0, nullable: true })
  sueldo_soles: number | null;

  @Expose()
  @ApiProperty({ example: 'quincenal' })
  frecuencia_pago: 'semanal' | 'quincenal' | 'mensual';

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
