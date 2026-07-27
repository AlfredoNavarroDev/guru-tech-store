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
  ApiBody,
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
import { UploadImagenItemDto } from './dto/upload-imagen-item.dto';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

// Controlador REST para el módulo de ítems (productos y repuestos).
// Por defecto solo el rol 'abastecedor' puede acceder; algunos endpoints amplían el acceso a 'tecnico'.
@ApiTags('items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // Registra un nuevo ítem en el catálogo y crea su entrada de inventario en la sede del usuario autenticado.
  @Post()
  @ApiOperation({ summary: 'HU-11 — Registrar nuevo ítem en el catálogo' })
  @ApiCreatedResponse({ type: ItemResponseDto })
  create(
    @Body() dto: CreateItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ItemResponseDto> {
    return this.itemsService.create(dto, user.id_sede!);
  }

  // Lista ítems con filtros opcionales; el stock devuelto corresponde a la sede del usuario.
  @Get()
  @Roles('abastecedor', 'tecnico', 'administrador', 'propietario', 'vendedor')
  @ApiOperation({
    summary:
      'HU-13 / HU-14 — Listar ítems con filtros (tipo, nombre, sku, categoria)',
  })
  @ApiOkResponse({ type: ItemResponseDto, isArray: true })
  findAll(@Query() query: QueryItemsDto, @CurrentUser() user: JwtPayload) {
    return this.itemsService.findAll(query, user.id_sede ?? undefined);
  }

  // Devuelve el catálogo de categorías para poblar selectores en el frontend.
  @Get('categorias')
  @Roles('abastecedor', 'tecnico', 'administrador', 'propietario', 'vendedor')
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

  @Post('categorias')
  @ApiOperation({ summary: 'Registrar nueva categoría' })
  @ApiBody({ type: CreateCategoriaDto })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        id_categoria: { type: 'number' },
        nombre_categoria: { type: 'string' },
      },
    },
  })
  createCategoria(
    @Body() dto: CreateCategoriaDto,
  ): Promise<{ id_categoria: number; nombre_categoria: string }> {
    return this.itemsService.createCategoria(dto);
  }

  // Devuelve el catálogo de marcas para poblar selectores en el frontend.
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

  @Post('marcas')
  @ApiOperation({ summary: 'Registrar nueva marca' })
  @ApiBody({ type: CreateMarcaDto })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        id_marca: { type: 'number' },
        nombre: { type: 'string' },
      },
    },
  })
  createMarca(
    @Body() dto: CreateMarcaDto,
  ): Promise<{ id_marca: number; nombre: string }> {
    return this.itemsService.createMarca(dto);
  }

  @Get('sedes')
  @Roles('abastecedor', 'administrador', 'propietario', 'vendedor', 'tecnico')
  @ApiOperation({ summary: 'Listar todas las sedes disponibles' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id_sede: { type: 'number' },
          nombre: { type: 'string' },
        },
      },
    },
  })
  findSedes(): Promise<{ id_sede: number; nombre: string }[]> {
    return this.itemsService.findSedes();
  }

  // Recupera un único ítem por su clave primaria; lanza 404 si no existe.
  @Get(':id')
  @ApiOperation({ summary: 'Obtener ítem por ID' })
  @ApiOkResponse({ type: ItemResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ItemResponseDto> {
    return this.itemsService.findOne(id);
  }

  // Actualiza los campos escalares y/o las categorías del ítem indicado.
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

  // Aplica una entrada o salida de stock en la sede del usuario; responde 204 sin cuerpo.
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

  // Elimina el ítem; falla con 409 si tiene ventas o reparaciones asociadas.
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.itemsService.remove(id);
  }

  @Post(':id/imagen')
  @ApiOperation({ summary: 'Subir o actualizar imagen del ítem en R2' })
  @ApiOkResponse({ schema: { properties: { url: { type: 'string' } } } })
  @ApiNotFoundResponse({ description: 'Ítem no encontrado' })
  uploadImagen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadImagenItemDto,
  ): Promise<{ url: string }> {
    return this.itemsService.uploadImagen(id, dto);
  }
}
