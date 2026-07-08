import { PartialType } from '@nestjs/swagger';
import { CreateItemDto } from './create-item.dto';

// DTO de actualización: hereda todos los campos de CreateItemDto pero los hace opcionales con PartialType.
export class UpdateItemDto extends PartialType(CreateItemDto) {}
