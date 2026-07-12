import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PromocionesService } from './promociones.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';

@ApiTags('promociones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador', 'propietario')
@Controller('promociones')
export class PromocionesController {
  constructor(private readonly service: PromocionesService) {}

  @Get()
  @ApiOperation({ summary: 'List promotions (scoped by role)' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create promotion' })
  create(@Body() dto: CreatePromocionDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update promotion' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromocionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel promotion (sets estado=cancelada)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }
}
