import { Controller, Get, Header, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotasVentaService } from './notas-venta.service';

// Rutas públicas de notas de venta (sin JWT) para previsualizar templates en el navegador.
@ApiTags('boletas')
@Controller('boletas')
export class NotasVentaController {
  constructor(private readonly notasVentaService: NotasVentaService) {}

  // Preview con datos mock, sin BD. Para iterar el template rápidamente.
  @Get('preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Preview HTML con datos mock (dev, sin auth, sin BD)',
  })
  previewMock(): string {
    return this.notasVentaService.renderPreviewMock();
  }

  // Preview de boleta de cambio con datos mock, sin BD. Para iterar el template.
  @Get('cambio/preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Preview HTML de boleta de cambio con datos mock (dev, sin auth)',
  })
  previewCambioMock(): string {
    return this.notasVentaService.renderPreviewMockCambio();
  }

  // Renderiza HTML del comprobante con datos reales de una venta (sin PDF ni R2).
  @Get(':id/preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Preview HTML del comprobante (dev, sin auth)' })
  previewBoleta(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.notasVentaService.renderPreview(id);
  }
}
