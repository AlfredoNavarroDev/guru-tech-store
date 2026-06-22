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
import { CreateCambioDto } from './dto/create-cambio.dto';
import { QueryCambiosDto } from './dto/query-cambios.dto';

@ApiTags('cambios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor')
@Controller('cambios')
export class CambiosController {
  constructor(private readonly cambiosService: CambiosService) {}

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

  @Post()
  @ApiOperation({
    summary: 'Registrar cambio de producto (transacción atómica)',
  })
  create(@Body() dto: CreateCambioDto, @CurrentUser() user: JwtPayload) {
    return this.cambiosService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar cambios de la sede (paginado, filtrable por fecha)',
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryCambiosDto) {
    return this.cambiosService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cambio por ID' })
  @ApiNotFoundResponse({ description: 'Cambio no encontrado' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cambiosService.findOne(id, user);
  }
}
