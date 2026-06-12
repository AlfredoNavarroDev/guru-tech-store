import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CatalogoService } from './catalogo.service';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';

// Solo lectura: catálogo filtrado por sede del vendedor (HU-05).
@ApiTags('catalogo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor')
@Controller(['catalogo', 'catalogos'])
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  // HU-05: Productos con stock disponible en la sede del vendedor.
  @Get()
  @ApiOperation({
    summary: 'HU-05 — Productos con stock disponible en la sede del vendedor',
  })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryCatalogoDto,
  ): Promise<object[]> {
    return this.catalogoService.findAll(user.id_sede!, query);
  }
}
