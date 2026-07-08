import {
  Body,
  Controller,
  Delete,
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types';
import { ReparacionesService } from './reparaciones.service';
import { PagosService } from '../pagos/pagos.service';
import { BoletasService } from '../boletas/boletas.service';
import { CreateReparacionDto } from './dto/create-reparacion.dto';
import { UpdateEstadoReparacionDto } from './dto/update-estado-reparacion.dto';
import { AddRepuestoReparacionDto } from './dto/add-repuesto-reparacion.dto';
import { UploadFotoReparacionDto } from './dto/upload-foto-reparacion.dto';
import { QueryReparacionesDto } from './dto/query-reparaciones.dto';
import { CreatePagoReparacionDto } from '../pagos/dto/create-pago-reparacion.dto';

// Controlador REST de reparaciones. Acceso restringido al rol 'tecnico'; agrupa ingreso, estados, repuestos, pagos y boletas.
@ApiTags('reparaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tecnico')
@Controller('reparaciones')
export class ReparacionesController {
  constructor(
    private readonly reparacionesService: ReparacionesService,
    private readonly pagosService: PagosService,
    private readonly boletasService: BoletasService,
  ) {}

  // ── Reparaciones ───────────────────────────────────────────────────────

  // HU-15: Registra ingreso de equipo al servicio técnico.
  @Post()
  @ApiOperation({ summary: 'HU-15 — Registrar ingreso de equipo' })
  create(@Body() dto: CreateReparacionDto, @CurrentUser() user: JwtPayload) {
    return this.reparacionesService.create(dto, user);
  }

  // HU-18: Historial de reparaciones filtrable y paginado.
  @Get()
  @ApiOperation({ summary: 'HU-18 — Historial de reparaciones (paginado)' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryReparacionesDto,
  ) {
    return this.reparacionesService.findAll(user, query);
  }

  // HU-18: Detalle completo de una reparación con repuestos usados.
  @Get(':id')
  @ApiOperation({ summary: 'HU-18 — Detalle de reparación' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reparacionesService.findOne(id, user);
  }

  // HU-16: Actualiza estado de reparación.
  @Patch(':id/estado')
  @ApiOperation({ summary: 'HU-16 — Actualizar estado de reparación' })
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoReparacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reparacionesService.updateEstado(id, dto, user);
  }

  // ── Fotos ─────────────────────────────────────────────────────────────

  // RF-26: Sube foto de la etapa actual a R2 y persiste URL en el registro.
  @Post(':id/fotos')
  @ApiOperation({ summary: 'RF-26 — Subir foto de etapa del servicio técnico' })
  uploadFoto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadFotoReparacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reparacionesService.uploadFoto(id, dto, user);
  }

  // ── Repuestos ──────────────────────────────────────────────────────────

  // HU-17: Registra repuesto utilizado en reparación (descuenta stock via trigger).
  @Post(':id/repuestos')
  @ApiOperation({ summary: 'HU-17 — Agregar repuesto a reparación' })
  addRepuesto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddRepuestoReparacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reparacionesService.addRepuesto(id, dto, user);
  }

  // HU-17: Elimina repuesto de reparación (devuelve stock via trigger).
  @Delete(':id/repuestos/:repuestoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'HU-17 — Eliminar repuesto de reparación' })
  removeRepuesto(
    @Param('id', ParseIntPipe) id: number,
    @Param('repuestoId', ParseIntPipe) repuestoId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reparacionesService.removeRepuesto(id, repuestoId, user);
  }

  // ── Pagos ──────────────────────────────────────────────────────────────

  // HU-19: Registra adelanto o pago final de reparación.
  @Post(':id/pagos')
  @ApiOperation({ summary: 'HU-19 — Registrar pago de reparación' })
  createPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePagoReparacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pagosService.createForReparacion(id, dto, user);
  }

  // HU-19: Lista adelantos y pagos de una reparación.
  @Get(':id/pagos')
  @ApiOperation({ summary: 'HU-19 — Ver pagos de reparación' })
  findPagos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pagosService.findByReparacion(id, user);
  }

  // ── Boletas ────────────────────────────────────────────────────────────

  // Emite boleta de servicio técnico. Idempotente.
  @Post(':id/boleta')
  @ApiOperation({ summary: 'Emitir boleta de reparación' })
  emitirBoleta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boletasService.emitirParaReparacion(id, user);
  }

  // Devuelve boleta existente de una reparación.
  @Get(':id/boleta')
  @ApiOperation({ summary: 'Ver boleta de reparación' })
  findBoleta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boletasService.findByReparacion(id, user);
  }
}
