// app/Backend/src/sedes/sedes.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

export interface SedeDto {
  id_sede: number;
  nombre: string;
  direccion: string;
}

@ApiTags('sedes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('propietario', 'administrador', 'admin')
@Controller('sedes')
export class SedesController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas las sedes' })
  @ApiOkResponse({ description: 'Array de sedes' })
  async getSedes(): Promise<SedeDto[]> {
    return this.dataSource
      .createQueryBuilder()
      .select(['s.id_sede', 's.nombre', 's.direccion'])
      .from('sedes', 's')
      .orderBy('s.id_sede', 'ASC')
      .getRawMany<SedeDto>();
  }
}
