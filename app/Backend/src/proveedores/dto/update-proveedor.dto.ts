import { PartialType } from '@nestjs/swagger';
import { CreateProveedorDto } from './create-proveedor.dto';

// Hace opcionales todos los campos de CreateProveedorDto para soportar actualizaciones parciales (PATCH).
export class UpdateProveedorDto extends PartialType(CreateProveedorDto) {}
