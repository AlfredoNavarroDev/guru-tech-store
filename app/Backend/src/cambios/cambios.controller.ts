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
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types';
import { CambiosService } from './cambios.service';
import { BoletasService } from '../boletas/boletas.service';
import { CreateCambioDto } from './dto/create-cambio.dto';
import { QueryCambiosDto } from './dto/query-cambios.dto';
import { QueryVentasDto } from './dto/query-ventas.dto';

// Controlador REST para cambios de producto; accesible solo por vendedores con JWT válido.
@ApiTags('cambios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor')
@Controller('cambios')
export class CambiosController {
  constructor(
    private readonly cambiosService: CambiosService,
    // BoletasService se inyecta aquí para emitir/consultar la boleta del cambio.
    private readonly boletasService: BoletasService,
  ) {}

  // Devuelve ventas de la sede filtradas por fecha; limitado a 20 resultados para el selector de cambios.
  @Get('ventas')
  @ApiOperation({
    summary: 'Listar ventas de la sede (filtrable por fecha, máx 20)',
  })
  findVentas(@CurrentUser() user: JwtPayload, @Query() query: QueryVentasDto) {
    return this.cambiosService.findVentas(user, query.fecha);
  }

  // GET /cambios/venta/:id — declarado antes de :id para evitar conflicto de rutas.
  @Get('venta/:id')
  @ApiOperation({
    summary: 'Cabecera + ítems de una venta para el flujo de cambio',
  })
  @ApiNotFoundResponse({ description: 'Venta no encontrada en la sede' })
  findVentaDetalle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cambiosService.findVentaDetalle(id, user);
  }

  // Registra el cambio de producto de forma atómica (devuelve el ítem y entrega otro).
  @Post()
  @ApiOperation({
    summary: 'Registrar cambio de producto (transacción atómica)',
  })
  create(@Body() dto: CreateCambioDto, @CurrentUser() user: JwtPayload) {
    return this.cambiosService.create(dto, user);
  }

  // Lista todos los cambios de la sede con paginación y filtros opcionales de fecha.
  @Get()
  @ApiOperation({
    summary: 'Listar cambios de la sede (paginado, filtrable por fecha)',
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryCambiosDto) {
    return this.cambiosService.findAll(user, query);
  }

  // Devuelve el detalle de un cambio concreto; la sede del JWT limita el acceso.
  @Get(':id')
  @ApiOperation({ summary: 'Obtener cambio por ID' })
  @ApiNotFoundResponse({ description: 'Cambio no encontrado' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cambiosService.findOne(id, user);
  }

  // Boleta routes — declared after static routes to avoid conflicts.

  // Emite la boleta de comprobante asociada a un cambio; falla si ya existe una.
  @Post(':id/boleta')
  @ApiOperation({
    summary: 'Emitir boleta de comprobante de cambio de producto',
  })
  @ApiNotFoundResponse({ description: 'Cambio no encontrado' })
  @ApiConflictResponse({ description: 'El cambio ya tiene boleta emitida' })
  emitirBoleta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boletasService.emitirParaCambio(id, user);
  }

  // Recupera la boleta previamente emitida para el cambio indicado.
  @Get(':id/boleta')
  @ApiOperation({ summary: 'Obtener boleta de cambio de producto' })
  @ApiNotFoundResponse({ description: 'Cambio no encontrado o sin boleta' })
  getBoleta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boletasService.findByCambio(id, user);
  }
}
