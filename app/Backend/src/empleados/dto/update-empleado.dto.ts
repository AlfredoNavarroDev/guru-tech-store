import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEmpleadoDto } from './create-empleado.dto';

// DTO de actualización parcial. Excluye contraseña y documento (tienen endpoints dedicados).
export class UpdateEmpleadoDto extends PartialType(
  OmitType(CreateEmpleadoDto, [
    'password',
    'tipo_documento',
    'nro_documento',
  ] as const),
) {}
