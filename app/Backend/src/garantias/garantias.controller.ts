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
import { QueryGarantiasDto } from './dto/query-garantias.dto';

@ApiTags('garantias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor', 'tecnico')
@Controller('garantias')
export class GarantiasController {
  constructor(private readonly garantiasService: GarantiasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear garantía de reparación (solo tecnico)' })
  create(
    @Body() dto: CreateGarantiaReparacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.garantiasService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar garantías (paginado, scoped por rol)' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryGarantiasDto,
  ) {
    return this.garantiasService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de garantía' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.garantiasService.findOne(id, user);
  }
}
