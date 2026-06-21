import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types';
import { ItemsService } from './items.service';
import { AjusteStockDto } from './dto/ajuste-stock.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { ItemResponseDto } from './dto/item-response.dto';

@ApiTags('items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @ApiOperation({ summary: 'HU-11 — Registrar nuevo ítem en el catálogo' })
  @ApiCreatedResponse({ type: ItemResponseDto })
  create(
    @Body() dto: CreateItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ItemResponseDto> {
    return this.itemsService.create(dto, user.id_sede!);
  }

  @Get()
  @ApiOperation({
    summary:
      'HU-13 / HU-14 — Listar ítems con filtros (tipo, nombre, sku, categoria)',
  })
  @ApiOkResponse({ type: ItemResponseDto, isArray: true })
  findAll(@Query() query: QueryItemsDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.findAll(query, user.id_sede ?? undefined);
  }

  @Get('categorias')
  @ApiOperation({ summary: 'Listar todas las categorías disponibles' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id_categoria: { type: 'number' },
          nombre_categoria: { type: 'string' },
        },
      },
    },
  })
  findCategorias(): Promise<
    { id_categoria: number; nombre_categoria: string }[]
  > {
    return this.itemsService.findCategorias();
  }

  @Get('marcas')
  @ApiOperation({ summary: 'Listar todas las marcas disponibles' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id_marca: { type: 'number' },
          nombre: { type: 'string' },
        },
      },
    },
  })
  findMarcas(): Promise<{ id_marca: number; nombre: string }[]> {
    return this.itemsService.findMarcas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ítem por ID' })
  @ApiOkResponse({ type: ItemResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ItemResponseDto> {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'HU-11 — Actualizar ítem del catálogo' })
  @ApiOkResponse({ type: ItemResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    return this.itemsService.update(id, dto);
  }

  @Patch(':id/stock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'HU-12 — Ajuste directo de stock (entrada o salida)',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  ajusteStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AjusteStockDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.itemsService.ajusteStock(id, dto, user.id_sede!);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.itemsService.remove(id);
  }
}
