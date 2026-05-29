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
import { CreatePagoVentaDto } from '../pagos/dto/create-pago-venta.dto';
import { CreateBoletaVentaDto } from '../boletas/dto/create-boleta-venta.dto';

@ApiTags('ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor')
@Controller('ventas')
export class VentasController {
  constructor(
    private readonly ventasService: VentasService,
    private readonly pagosService: PagosService,
    private readonly boletasService: BoletasService,
  ) {}

  // ── Ventas ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'HU-04 — Registrar venta con detalles' })
  create(@Body() dto: CreateVentaDto, @CurrentUser() user: JwtPayload) {
    return this.ventasService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'HU-08 — Historial de ventas del vendedor (paginado)',
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryVentasDto) {
    return this.ventasService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'HU-08 — Detalle de una venta' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ventasService.findOne(id, user);
  }

  // ── Pagos ────────────────────────────────────────────────────────────────

  @Post(':id/pagos')
  @ApiOperation({ summary: 'HU-04 — Registrar pago para una venta' })
  createPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePagoVentaDto,
  ) {
    return this.pagosService.createForVenta(id, dto);
  }

  @Get(':id/pagos')
  @ApiOperation({ summary: 'HU-04 — Ver pagos de una venta' })
  findPagos(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findByVenta(id);
  }

  // ── Boletas ──────────────────────────────────────────────────────────────

  @Post(':id/boleta')
  @ApiOperation({ summary: 'HU-06 — Emitir boleta PDF para una venta' })
  emitirBoleta(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBoletaVentaDto,
  ) {
    return this.boletasService.emitir(id, dto);
  }

  @Get(':id/boleta')
  @ApiOperation({ summary: 'HU-06 — Obtener boleta de una venta' })
  findBoleta(@Param('id', ParseIntPipe) id: number) {
    return this.boletasService.findByVenta(id);
  }
}
