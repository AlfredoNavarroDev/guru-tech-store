// app/Backend/src/propietario/dto/reportes-pdf-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';
import { ReportesQueryDto } from './reportes-query.dto';

export class ReportesPdfQueryDto extends ReportesQueryDto {
  @ApiProperty({
    description: 'Tipo de reporte PDF',
    enum: ['ventas', 'reparaciones', 'ventas-reparaciones', 'compras'],
  })
  @IsNotEmpty()
  @IsIn(['ventas', 'reparaciones', 'ventas-reparaciones', 'compras'])
  tipo!: 'ventas' | 'reparaciones' | 'ventas-reparaciones' | 'compras';
}
