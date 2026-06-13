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
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { AddItemCompraDto } from './dto/add-item-compra.dto';
import { UpdateItemCompraDto } from './dto/update-item-compra.dto';
import { CompraResponseDto } from './dto/compra-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('compras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear orden de compra (cabecera)' })
  @ApiCreatedResponse({ type: CompraResponseDto })
  create(
    @Body() dto: CreateCompraDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CompraResponseDto> {
    return this.comprasService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Historial de compras de la sede' })
  @ApiOkResponse({ type: CompraResponseDto, isArray: true })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: JwtPayload) {
    return this.comprasService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de compra con ítems' })
  @ApiOkResponse({ type: CompraResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<CompraResponseDto> {
    return this.comprasService.findOne(id, user.id_sede!);
  }

  @Post(':id/items')
  @ApiOperation({
    summary: 'HU-11/HU-12 — Agregar ítem a compra (trigger incrementa stock)',
  })
  @ApiCreatedResponse({
    description: '201 sin body — stock actualizado por trigger',
  })
  @HttpCode(HttpStatus.CREATED)
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddItemCompraDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.comprasService.addItem(id, dto, user);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({
    summary: 'Modificar cantidad de ítem (trigger ajusta delta en stock)',
  })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateItemCompraDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.comprasService.updateItem(id, itemId, dto, user);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Eliminar ítem de compra (trigger revierte stock)' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.comprasService.removeItem(id, itemId, user);
  }
}
