import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EmpleadosService } from './empleados.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { UpdatePasswordEmpleadoDto } from './dto/update-password-empleado.dto';
import { UpdateEstadoEmpleadoDto } from './dto/update-estado-empleado.dto';
import { QueryEmpleadosDto } from './dto/query-empleados.dto';
import { EmpleadoResponseDto } from './dto/empleado-response.dto';
import { EmpleadoRendimientoDto } from './dto/empleado-rendimiento.dto';
import { RendimientoHoyDto } from './dto/rendimiento-hoy.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types';

// Controlador de empleados (HU-05). Solo accesible por administradores.
@ApiTags('empleados')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador')
@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  // Registra un nuevo empleado en la sede del administrador autenticado.
  @Post()
  @ApiOperation({ summary: 'HU-05 — Registrar nuevo empleado en la sede' })
  @ApiCreatedResponse({ type: EmpleadoResponseDto })
  create(
    @Body() dto: CreateEmpleadoDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<EmpleadoResponseDto> {
    return this.empleadosService.create(dto, user);
  }

  // Lista empleados de la sede con paginación y filtros opcionales por rol y estado.
  @Get()
  @ApiOperation({ summary: 'HU-05 — Listar empleados de la sede (paginado)' })
  @ApiOkResponse({ description: 'Lista paginada de empleados' })
  findAll(@Query() query: QueryEmpleadosDto, @CurrentUser() user: JwtPayload) {
    return this.empleadosService.findAll(user, query);
  }

  @Get('rendimiento')
  @Roles('administrador', 'propietario')
  @ApiOperation({
    summary:
      'Admin — Rendimiento del equipo de la sede (vendedores y técnicos)',
  })
  @ApiOkResponse({
    type: [EmpleadoRendimientoDto],
    description: 'Array ordenado por ingresos_hoy desc',
  })
  getRendimiento(
    @CurrentUser() user: JwtPayload,
  ): Promise<EmpleadoRendimientoDto[]> {
    return this.empleadosService.getRendimiento(user);
  }

  @Get('rendimiento-hoy')
  @Roles('vendedor', 'tecnico')
  @ApiOperation({ summary: 'Total vendido hoy vs meta del rol' })
  @ApiOkResponse({ type: RendimientoHoyDto })
  getRendimientoHoy(
    @CurrentUser() user: JwtPayload,
  ): Promise<RendimientoHoyDto> {
    return this.empleadosService.getRendimientoHoy(user);
  }

  // Devuelve el detalle de un empleado (scoped a la sede del admin).
  @Get(':id')
  @ApiOperation({ summary: 'HU-05 — Detalle de un empleado' })
  @ApiOkResponse({ type: EmpleadoResponseDto })
  @ApiNotFoundResponse({ description: 'Empleado no encontrado' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<EmpleadoResponseDto> {
    return this.empleadosService.findOne(id, user);
  }

  // Actualiza datos del empleado (PATCH parcial, sin cambiar documento ni contraseña aquí).
  @Patch(':id')
  @ApiOperation({ summary: 'HU-05 — Actualizar datos del empleado' })
  @ApiOkResponse({ type: EmpleadoResponseDto })
  @ApiNotFoundResponse({ description: 'Empleado no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmpleadoDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<EmpleadoResponseDto> {
    return this.empleadosService.update(id, dto, user);
  }

  // Cambia la contraseña de un empleado. Responde 204 sin cuerpo.
  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'HU-05 — Cambiar contraseña de un empleado' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Empleado no encontrado' })
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePasswordEmpleadoDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.empleadosService.updatePassword(id, dto, user);
  }

  // Activa o desactiva un empleado. Al desactivar revoca sus refresh tokens (HU-24).
  @Patch(':id/estado')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'HU-05 + HU-24 — Activar/desactivar empleado (revoca tokens si inactivo)',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Empleado no encontrado' })
  @ApiForbiddenResponse({
    description: 'No puedes desactivar tu propia cuenta',
  })
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoEmpleadoDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.empleadosService.updateEstado(id, dto, user);
  }
}
