import { Controller, Get, Header, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoletasService } from './boletas.service';

// Rutas públicas de boletas (sin JWT) para previsualizar templates en el navegador.
@ApiTags('boletas')
@Controller('boletas')
export class BoletasController {
  constructor(private readonly boletasService: BoletasService) {}

  // Preview con datos mock, sin BD. Para iterar el template rápidamente.
  @Get('preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Preview HTML con datos mock (dev, sin auth, sin BD)',
  })
  previewMock(): string {
    return this.boletasService.renderPreviewMock();
  }

  // Renderiza HTML del comprobante con datos reales de una venta (sin PDF ni R2).
  @Get(':id/preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Preview HTML del comprobante (dev, sin auth)' })
  previewBoleta(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.boletasService.renderPreview(id);
  }
}
