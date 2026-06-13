import { Controller, Get, UseGuards } from '@nestjs/common';
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
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { StockService } from './stock.service';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'HU-12 — Stock actual de la sede del abastecedor' })
  @ApiOkResponse({ description: 'Datos de v_abastecedor_stock_actual' })
  findAll(@CurrentUser() user: JwtPayload): Promise<object[]> {
    return this.stockService.findAll(user.id_sede!);
  }

  @Get('critico')
  @ApiOperation({
    summary: 'HU-12 — Ítems bajo stock mínimo ordenados por urgencia',
  })
  @ApiOkResponse({ description: 'Datos de v_abastecedor_stock_critico' })
  findCritico(@CurrentUser() user: JwtPayload): Promise<object[]> {
    return this.stockService.findCritico(user.id_sede!);
  }
}
