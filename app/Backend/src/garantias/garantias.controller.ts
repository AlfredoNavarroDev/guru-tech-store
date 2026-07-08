import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { GarantiasService } from './garantias.service';
import { CreateGarantiaReparacionDto } from './dto/create-garantia-reparacion.dto';
import { CreateReclamoGarantiaDto } from './dto/create-reclamo-garantia.dto';
import { QueryGarantiasDto } from './dto/query-garantias.dto';

// Controlador de garantías: expone endpoints para crear, reclamar y consultar garantías.
// Accesible por vendedor y técnico; cada operación filtra datos según el rol del usuario.
@ApiTags('garantias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor', 'tecnico')
@Controller('garantias')
export class GarantiasController {
  constructor(private readonly garantiasService: GarantiasService) {}

  // POST /garantias — el técnico registra una garantía asociada a una reparación.
  @Post()
  @ApiOperation({ summary: 'Crear garantía de reparación (solo tecnico)' })
  create(
    @Body() dto: CreateGarantiaReparacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.garantiasService.create(dto, user);
  }

  // POST /garantias/:id/reclamos — consume la garantía activa y abre una nueva reparación.
  @Post(':id/reclamos')
  @ApiOperation({
    summary: 'Crear reclamo de garantía de servicio técnico (solo tecnico)',
  })
  crearReclamo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReclamoGarantiaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.garantiasService.crearReclamo(id, dto, user);
  }

  // GET /garantias — lista paginada filtrada por sede y rol (vendedor ve ventas, técnico ve reparaciones).
  @Get()
  @ApiOperation({ summary: 'Listar garantías (paginado, scoped por rol)' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryGarantiasDto) {
    return this.garantiasService.findAll(user, query);
  }

  // GET /garantias/:id — detalle de una garantía si pertenece a la sede del usuario.
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de garantía' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.garantiasService.findOne(id, user);
  }
}
