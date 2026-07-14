// app/Backend/src/sedes/dto/update-sede.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateSedeDto } from './create-sede.dto';

export class UpdateSedeDto extends PartialType(CreateSedeDto) {}
