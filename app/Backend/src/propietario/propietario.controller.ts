// app/Backend/src/propietario/propietario.controller.ts
import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PropietarioService } from './propietario.service';
import { ResumenHoyDto } from './dto/resumen-hoy.dto';
import { VentaRecienteDto } from './dto/venta-reciente.dto';
import { TopProductoDto } from './dto/top-producto.dto';
import { UpsertMetaRolDto } from './dto/upsert-meta-rol.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types';
import { ReportesQueryDto } from './dto/reportes-query.dto';
import { ReportesPdfQueryDto } from './dto/reportes-pdf-query.dto';

@ApiTags('propietario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('propietario')
@Controller('propietario')
export class PropietarioController {
  constructor(private readonly propietarioService: PropietarioService) {}

  @Get('resumen-hoy')
  @ApiOperation({ summary: 'Propietario — KPIs del día (optional ?id_sede)' })
  @ApiQuery({ name: 'id_sede', required: false, type: Number })
  @ApiOkResponse({ type: ResumenHoyDto })
  getResumenHoy(
    @CurrentUser() user: JwtPayload,
    @Query('id_sede') idSede?: string,
  ): Promise<ResumenHoyDto> {
    const sede = idSede ? parseInt(idSede, 10) : (user.id_sede ?? null);
    return this.propietarioService.getResumenHoy(sede);
  }

  @Get('ventas-recientes')
  @ApiOperation({
    summary: 'Propietario — Últimas 8 ventas (optional ?id_sede)',
  })
  @ApiQuery({ name: 'id_sede', required: false, type: Number })
  @ApiOkResponse({ type: [VentaRecienteDto] })
  getVentasRecientes(
    @CurrentUser() user: JwtPayload,
    @Query('id_sede') idSede?: string,
  ): Promise<VentaRecienteDto[]> {
    const sede = idSede ? parseInt(idSede, 10) : (user.id_sede ?? null);
    return this.propietarioService.getVentasRecientes(sede);
  }

  @Get('top-productos')
  @ApiOperation({
    summary: 'Propietario — Top 5 productos (optional ?id_sede)',
  })
  @ApiQuery({ name: 'id_sede', required: false, type: Number })
  @ApiOkResponse({ type: [TopProductoDto] })
  getTopProductos(
    @CurrentUser() user: JwtPayload,
    @Query('id_sede') idSede?: string,
  ): Promise<TopProductoDto[]> {
    const sede = idSede ? parseInt(idSede, 10) : (user.id_sede ?? null);
    return this.propietarioService.getTopProductos(sede);
  }

  @Patch('config/metas-rol')
  @Roles('propietario', 'administrador')
  @ApiOperation({ summary: 'Upsert meta de ventas diaria para un rol' })
  async upsertMetaRol(@Body() dto: UpsertMetaRolDto): Promise<void> {
    return this.propietarioService.upsertMetaRol(dto);
  }

  @Get('empleados-vs-meta-hoy')
  @ApiOperation({
    summary: 'Empleados con total vendido hoy vs meta (optional ?id_sede)',
  })
  @ApiQuery({ name: 'id_sede', required: false, type: Number })
  getEmpleadosVsMetaHoy(
    @CurrentUser() user: JwtPayload,
    @Query('id_sede') idSede?: string,
  ) {
    const sede = idSede ? parseInt(idSede, 10) : (user.id_sede ?? null);
    return this.propietarioService.getEmpleadosVsMetaHoy(sede);
  }

  @Get('reportes')
  @ApiOperation({
    summary: 'Propietario — datos de reportes por rango de fechas y sede',
  })
  @ApiQuery({ name: 'id_sede', required: false, type: Number })
  @ApiQuery({ name: 'fecha_desde', required: false, type: String })
  @ApiQuery({ name: 'fecha_hasta', required: false, type: String })
  getReportes(@Query() query: ReportesQueryDto) {
    return this.propietarioService.getReportes(query);
  }

  @Get('reportes/pdf')
  @ApiOperation({
    summary: 'Propietario — genera o recupera PDF de reporte desde R2',
  })
  @ApiQuery({ name: 'tipo', required: true, enum: ['ventas', 'reparaciones', 'ventas-reparaciones', 'compras'] })
  @ApiQuery({ name: 'id_sede', required: false, type: Number })
  @ApiQuery({ name: 'fecha_desde', required: false, type: String })
  @ApiQuery({ name: 'fecha_hasta', required: false, type: String })
  @ApiOkResponse({ schema: { properties: { url: { type: 'string' } } } })
  getReportesPdf(@Query() query: ReportesPdfQueryDto): Promise<{ url: string }> {
    return this.propietarioService.getReportePdf(query.tipo, query);
  }
}
