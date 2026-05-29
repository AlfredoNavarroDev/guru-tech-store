import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as puppeteer from 'puppeteer';
import { DataSource, Repository } from 'typeorm';
import { Boleta } from './entities/boleta.entity';
import { CreateBoletaVentaDto } from './dto/create-boleta-venta.dto';

interface VentaRow {
  id_venta: number;
  id_sede: number;
  sede: string;
  vendedor: string;
  cliente: string | null;
  doc_cliente: string | null;
  fecha_emision: Date;
}

interface DetalleRow {
  producto: string;
  cantidad: number;
  precio_unitario_momento: number;
  importe: number;
}

@Injectable()
export class BoletasService {
  private readonly logger = new Logger(BoletasService.name);
  private s3: S3Client;

  constructor(
    @InjectRepository(Boleta)
    private readonly boletaRepo: Repository<Boleta>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.get<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async emitir(idVenta: number, dto: CreateBoletaVentaDto): Promise<Boleta> {
    const existing = await this.boletaRepo.findOne({
      where: { id_venta: idVenta },
    });
    if (existing) {
      throw new ConflictException(
        `La venta ${idVenta} ya tiene boleta emitida`,
      );
    }

    const ventaRows = await this.dataSource.query<VentaRow[]>(
      `SELECT v.id_venta, v.id_sede, s.nombre AS sede,
              e.nombre_completo AS vendedor,
              c.nombre_completo AS cliente,
              c.nro_documento   AS doc_cliente,
              v.fecha_emision
       FROM Ventas v
       JOIN Sedes s ON s.id_sede = v.id_sede
       JOIN Empleados e ON e.id_empleado = v.id_empleado
       LEFT JOIN Clientes c ON c.id_cliente = v.id_cliente
       WHERE v.id_venta = $1`,
      [idVenta],
    );
    if (!ventaRows.length)
      throw new NotFoundException(`Venta ${idVenta} no encontrada`);
    const venta = ventaRows[0];

    const detalles = await this.dataSource.query<DetalleRow[]>(
      `SELECT i.nombre AS producto, dv.cantidad,
              dv.precio_unitario_momento, dv.importe
       FROM Detalle_Venta dv
       JOIN Items i ON i.id_item = dv.id_item
       WHERE dv.id_venta = $1`,
      [idVenta],
    );

    const numero = await this.generarNumero(venta.id_sede);

    let boleta = this.boletaRepo.create({
      numero,
      id_venta: idVenta,
      id_reparacion: null,
      total: dto.total,
      estado: 'emitida',
      url_pdf: null,
    });

    await this.dataSource.transaction(async (manager) => {
      boleta = await manager.save(Boleta, boleta);
      try {
        const html = this.renderHtml(boleta, venta, detalles);
        const pdfBuffer = await this.generatePdf(html);
        const key = `boletas/${boleta.numero}.pdf`;
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.config.get<string>('R2_BUCKET_NAME'),
            Key: key,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
          }),
        );
        boleta.url_pdf = `${this.config.get<string>('R2_PUBLIC_URL')}/${key}`;
        await manager.save(Boleta, boleta);
      } catch (err) {
        this.logger.error('Error generando PDF o subiendo a R2', err);
        throw err;
      }
    });

    return boleta;
  }

  async findByVenta(idVenta: number): Promise<Boleta> {
    const boleta = await this.boletaRepo.findOne({
      where: { id_venta: idVenta },
    });
    if (!boleta)
      throw new NotFoundException(`No hay boleta para la venta ${idVenta}`);
    return boleta;
  }

  private async generarNumero(idSede: number): Promise<string> {
    const prefix = `B${String(idSede).padStart(3, '0')}`;
    const rows = await this.dataSource.query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM Boletas WHERE numero LIKE $1`,
      [`${prefix}-%`],
    );
    const seq = parseInt(rows[0].total, 10) + 1;
    return `${prefix}-${String(seq).padStart(7, '0')}`;
  }

  private renderHtml(
    boleta: Boleta,
    venta: VentaRow,
    detalles: DetalleRow[],
  ): string {
    const filas = detalles
      .map(
        (d) =>
          `<tr>
            <td>${d.producto}</td>
            <td style="text-align:center">${String(d.cantidad)}</td>
            <td style="text-align:right">S/ ${Number(d.precio_unitario_momento).toFixed(2)}</td>
            <td style="text-align:right">S/ ${Number(d.importe).toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
  h1 { font-size: 1.4rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f0f0f0; padding: 6px; text-align: left; }
  td { padding: 5px; border-bottom: 1px solid #ddd; }
  .total { font-weight: bold; font-size: 1.1rem; text-align: right; margin-top: 10px; }
</style></head>
<body>
  <h1>BOLETA DE VENTA</h1>
  <p><strong>N°:</strong> ${boleta.numero}</p>
  <p><strong>Fecha:</strong> ${new Date(boleta.fecha_emision).toLocaleString('es-PE')}</p>
  <p><strong>Sede:</strong> ${venta.sede}</p>
  <p><strong>Vendedor:</strong> ${venta.vendedor}</p>
  <p><strong>Cliente:</strong> ${venta.cliente ?? 'Consumidor final'}</p>
  <table>
    <thead><tr><th>Producto</th><th>Cant.</th><th>P. Unitario</th><th>Importe</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <p class="total">TOTAL: S/ ${Number(boleta.total).toFixed(2)}</p>
</body>
</html>`;
  }

  private async generatePdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
