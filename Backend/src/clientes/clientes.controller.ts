import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { QueryClienteDto } from './dto/query-cliente.dto';

/**
 * @purpose CRUD de clientes (HU-07). Sin DELETE → historial de compras se preserva.
 * Requiere JWT + rol 'vendedor'.
 */
@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  /** HU-07: Listar clientes con filtros (nombre/documento). */
  @Get()
  @ApiOperation({ summary: 'HU-07 — Buscar clientes por nombre o documento' })
  findAll(@Query() query: QueryClienteDto): Promise<object[]> {
    return this.clientesService.findAll(query);
  }

  /** HU-07: Detalle de cliente con total compras. */
  @Get(':id')
  @ApiOperation({ summary: 'HU-07 — Detalle de cliente con total compras' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<object> {
    return this.clientesService.findOne(id);
  }

  /** HU-07: Crear cliente (valida unicidad tipo+nro documento). */
  @Post()
  @ApiOperation({ summary: 'HU-07 — Crear cliente' })
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  /** HU-07: Actualizar cliente (PATCH → solo campos modificados). */
  @Patch(':id')
  @ApiOperation({ summary: 'HU-07 — Actualizar datos del cliente' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(id, dto);
  }
}
