import { Controller, Get, Header, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoletasService } from './boletas.service';

/**
 * @purpose Rutas públicas de boletas (sin JWT). Preview en navegador para iterar template.
 * Rutas protegidas (/ventas/:id/boletas) viven en VentasController.
 */
@ApiTags('boletas')
@Controller('boletas')
export class BoletasController {
  constructor(private readonly boletasService: BoletasService) {}

  /** DEV: Preview con datos mock. Sin BD. Para iterar el template. */
  @Get('preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Preview HTML con datos mock (dev, sin auth, sin BD)',
  })
  previewMock(): string {
    return this.boletasService.renderPreviewMock();
  }

  /** DEV: Renderiza HTML del comprobante con datos reales de una venta. Sin PDF ni R2. */
  @Get(':id/preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Preview HTML del comprobante (dev, sin auth)' })
  previewBoleta(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.boletasService.renderPreview(id);
  }
}
