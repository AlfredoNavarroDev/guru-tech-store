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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorResponseDto } from './dto/proveedor-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar proveedor' })
  @ApiCreatedResponse({ type: ProveedorResponseDto })
  create(@Body() dto: CreateProveedorDto): Promise<ProveedorResponseDto> {
    return this.proveedoresService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proveedores paginados' })
  @ApiOkResponse({ type: ProveedorResponseDto, isArray: true })
  findAll(@Query() query: PaginationDto) {
    return this.proveedoresService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  @ApiOkResponse({ type: ProveedorResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  @ApiOkResponse({ type: ProveedorResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProveedorDto,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.update(id, dto);
  }
}
