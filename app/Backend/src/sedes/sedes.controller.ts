// app/Backend/src/sedes/sedes.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types';
import { SedesService, SedeRow } from './sedes.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

@ApiTags('sedes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('propietario', 'administrador', 'admin')
@Controller('sedes')
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas las sedes' })
  @ApiOkResponse({ description: 'Array de sedes' })
  getSedes(): Promise<SedeRow[]> {
    return this.sedesService.getSedes();
  }

  @Post()
  @Roles('propietario')
  @ApiOperation({ summary: 'Crear nueva sede' })
  @ApiCreatedResponse({ description: 'Sede creada' })
  createSede(
    @Body() dto: CreateSedeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SedeRow> {
    return this.sedesService.createSede(dto, user.sub);
  }

  @Patch(':id')
  @Roles('propietario')
  @ApiOperation({ summary: 'Editar sede' })
  @ApiOkResponse({ description: 'Sede actualizada' })
  updateSede(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSedeDto,
  ): Promise<SedeRow> {
    return this.sedesService.updateSede(id, dto);
  }

  @Patch(':id/toggle')
  @Roles('propietario')
  @ApiOperation({ summary: 'Habilitar/deshabilitar sede' })
  @ApiOkResponse({ description: 'Estado de sede actualizado' })
  toggleSede(@Param('id', ParseIntPipe) id: number): Promise<SedeRow> {
    return this.sedesService.toggleSede(id);
  }
}
