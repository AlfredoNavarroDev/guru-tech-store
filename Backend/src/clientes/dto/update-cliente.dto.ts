import { PartialType } from '@nestjs/swagger';
import { CreateClienteDto } from './create-cliente.dto';

// DTO de actualización parcial (PATCH). Todos los campos son opcionales.
export class UpdateClienteDto extends PartialType(CreateClienteDto) {}
