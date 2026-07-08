import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types';
import { StockService } from './stock.service';
import { QueryStockDto } from './dto/query-stock.dto';

// Endpoints de consulta de stock para el rol 'abastecedor' (HU-12).
@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // Devuelve el stock paginado de la sede del abastecedor con filtros opcionales.
  @Get()
  @ApiOperation({
    summary: 'HU-12 — Stock actual de la sede con filtros y paginación',
  })
  @ApiOkResponse({
    description: 'PaginatedResult desde v_abastecedor_stock_actual',
  })
  findAll(@Query() query: QueryStockDto, @CurrentUser() user: JwtPayload) {
    return this.stockService.findAll(user.id_sede!, query);
  }

  // Devuelve los ítems por debajo del stock mínimo, ordenados por urgencia descendente.
  @Get('critico')
  @ApiOperation({
    summary: 'HU-12 — Ítems bajo stock mínimo ordenados por urgencia',
  })
  @ApiOkResponse({ description: 'Datos de v_abastecedor_stock_critico' })
  findCritico(@CurrentUser() user: JwtPayload): Promise<object[]> {
    return this.stockService.findCritico(user.id_sede!);
  }
}
