import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEmpleadoDto } from './create-empleado.dto';

export class UpdateEmpleadoDto extends PartialType(
  OmitType(CreateEmpleadoDto, ['password', 'tipo_documento', 'nro_documento'] as const),
) {}
