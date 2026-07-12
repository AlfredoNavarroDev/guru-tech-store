import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RestriccionesService } from './restricciones.service';
import { UpsertRestriccionDto } from './dto/upsert-restriccion.dto';

@ApiTags('restricciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador', 'propietario')
@Controller('restricciones')
export class RestriccionesController {
  constructor(private readonly service: RestriccionesService) {}

  @Get()
  @ApiOperation({ summary: 'List all item and category restrictions' })
  @ApiOkResponse({ schema: { type: 'object' } })
  findAll() {
    return this.service.findAll();
  }

  @Put('items/:id_item')
  @ApiOperation({ summary: 'Upsert restriction for a specific item' })
  upsertItem(
    @Param('id_item', ParseIntPipe) id_item: number,
    @Body() dto: UpsertRestriccionDto,
  ) {
    return this.service.upsertItemRestriccion(id_item, dto);
  }

  @Put('categorias/:id_categoria')
  @ApiOperation({ summary: 'Upsert restriction for a specific category' })
  upsertCategoria(
    @Param('id_categoria', ParseIntPipe) id_categoria: number,
    @Body() dto: UpsertRestriccionDto,
  ) {
    return this.service.upsertCategoriaRestriccion(id_categoria, dto);
  }
}
