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

// CRUD de clientes (HU-07). Sin DELETE para preservar historial de compras.
@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  // Lista clientes con filtros por nombre o documento.
  @Get()
  @ApiOperation({ summary: 'HU-07 — Buscar clientes por nombre o documento' })
  findAll(@Query() query: QueryClienteDto): Promise<object[]> {
    return this.clientesService.findAll(query);
  }

  // Obtiene detalle de un cliente con su total de compras.
  @Get(':id')
  @ApiOperation({ summary: 'HU-07 — Detalle de cliente con total compras' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<object> {
    return this.clientesService.findOne(id);
  }

  // Crea un cliente validando unicidad de tipo + nro de documento.
  @Post()
  @ApiOperation({ summary: 'HU-07 — Crear cliente' })
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  // Actualiza cliente (PATCH parcial, solo campos enviados).
  @Patch(':id')
  @ApiOperation({ summary: 'HU-07 — Actualizar datos del cliente' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(id, dto);
  }
}
