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
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { VentasService } from './ventas.service';
import { PagosService } from '../pagos/pagos.service';
import { BoletasService } from '../boletas/boletas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { QueryVentasDto } from './dto/query-ventas.dto';
import { ResumenHoyDto, VentaResponseDto } from './dto/venta-response.dto';
import { CreatePagoVentaDto } from '../pagos/dto/create-pago-venta.dto';

// Solo vendedor accede. Propietario y técnico tienen sus propias rutas.
@ApiTags('ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor')
@Controller('ventas')
// Controlador de venta directa. Agrupa ventas, pagos y boletas en un solo endpoint.
export class VentasController {
  constructor(
    private readonly ventasService: VentasService,
    private readonly pagosService: PagosService,
    private readonly boletasService: BoletasService,
  ) {}

  // ── Ventas ────────────────────────────────────────────────────────────

  // HU-04: Registra una venta con sus detalles.
  @Post()
  @ApiOperation({ summary: 'HU-04 — Registrar venta con detalles' })
  create(
    @Body() dto: CreateVentaDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VentaResponseDto> {
    return this.ventasService.create(dto, user);
  }

  // HU-08: Historial paginado de ventas del vendedor autenticado.
  @Get()
  @ApiOperation({
    summary: 'HU-08 — Historial de ventas del vendedor (paginado)',
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryVentasDto) {
    return this.ventasService.findAll(user, query);
  }

  // HU-08: KPIs del día (ventas, ingresos, clientes) + 5 ventas recientes.
  @Get('estadisticas')
  @ApiOperation({
    summary: 'HU-08 — KPIs del día: ventas, ingresos, clientes y recientes',
  })
  getEstadisticas(@CurrentUser() user: JwtPayload): Promise<ResumenHoyDto> {
    return this.ventasService.getResumenHoy(user);
  }

  // HU-08: Obtiene el detalle completo de una venta.
  @Get(':id')
  @ApiOperation({ summary: 'HU-08 — Detalle de una venta' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ventasService.findOne(id, user);
  }

  // ── Pagos ──────────────────────────────────────────────────────────────

  // HU-04: Registra un pago para una venta (soporta pago mixto con múltiples abonos).
  @Post(':id/pagos')
  @ApiOperation({ summary: 'HU-04 — Registrar pago para una venta' })
  createPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePagoVentaDto,
  ) {
    return this.pagosService.createForVenta(id, dto);
  }

  // HU-04: Lista los pagos asociados a una venta.
  @Get(':id/pagos')
  @ApiOperation({ summary: 'HU-04 — Ver pagos de una venta' })
  findPagos(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findByVenta(id);
  }

  // ── Boletas ────────────────────────────────────────────────────────────

  // HU-06: Emite la boleta en PDF para una venta (paso separado de la venta).
  @Post(':id/boletas')
  @ApiOperation({ summary: 'HU-06 — Emitir boleta PDF para una venta' })
  emitirBoleta(@Param('id', ParseIntPipe) id: number) {
    return this.boletasService.emitir(id);
  }

  // HU-06: Obtiene la boleta ya emitida de una venta.
  @Get(':id/boletas')
  @ApiOperation({ summary: 'HU-06 — Obtener boleta de una venta' })
  findBoleta(@Param('id', ParseIntPipe) id: number) {
    return this.boletasService.findByVenta(id);
  }
}
