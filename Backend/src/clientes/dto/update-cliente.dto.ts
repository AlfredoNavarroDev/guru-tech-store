import { PartialType } from '@nestjs/swagger';
import { CreateClienteDto } from './create-cliente.dto';

/**
 * @purpose DTO de actualización parcial (PATCH).
 * PartialType → todos los campos opcionales, validaciones heredadas.
 */
export class UpdateClienteDto extends PartialType(CreateClienteDto) {}
