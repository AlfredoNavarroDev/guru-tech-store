import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as Handlebars from 'handlebars';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource, Repository } from 'typeorm';
import { Boleta } from './entities/boleta.entity';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// Fila de v_boleta_venta: una por cada ítem de la venta.
interface BolVistaRow {
  id_venta: number;
  id_sede: number;
  id_empleado: number;
  sede_nombre: string;
  sede_direccion: string | null;
  sede_telefono: string | null;
  vendedor: string;
  fecha_emision: Date;
  monto_descuento: string;
  tipo_descuento: string | null;
  id_cliente: number | null;
  cliente_nombre: string | null;
  cliente_tipo_doc: string | null;
  cliente_nro_doc: string | null;
  producto: string;
  sku: string;
  cantidad: number;
  precio_unitario_momento: string;
  importe: string;
}

// Fila de pagos para el pie del comprobante.
interface PagoRow {
  metodo_pago: string;
  monto: string;
}

// Datos inyectados en la plantilla Handlebars.
interface BoletaTemplateData {
  logoBase64: string;
  sedeNombre: string;
  sedeDireccion: string;
  sedeTelefono: string;
  numero: string;
  fechaEmision: string;
  vendedor: string;
  clienteNombre: string | null;
  clienteTipoDoc: string | null;
  clienteNroDoc: string | null;
  detalles: {
    producto: string;
    sku: string;
    cantidad: number;
    precioUnitario: string;
    importe: string;
  }[];
  subtotal: string;
  tieneDescuento: boolean;
  descuento: string;
  descuentoLabel: string;
  total: string;
  pagos: { metodo: string; monto: string }[];
}

// Emite boletas de venta, genera PDF con Puppeteer y sube a Cloudflare R2.
@Injectable()
export class BoletasService implements OnModuleInit {
  private readonly logger = new Logger(BoletasService.name);
  private s3: S3Client;
  private templateFn: Handlebars.TemplateDelegate<BoletaTemplateData>;
  private logoBase64 = '';

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

  async onModuleInit(): Promise<void> {
    // Compila template Handlebars desde archivo externo.
    const source = readFileSync(
      join(__dirname, 'templates', 'boleta.hbs'),
      'utf8',
    );
    this.templateFn = Handlebars.compile<BoletaTemplateData>(source);

    // Pre-carga el logo como base64 para embeberlo en el HTML.
    const r2Public = this.config.get<string>('R2_PUBLIC_URL', '');
    if (r2Public) {
      const logoUrl = `${r2Public}/gts_logo.png`;
      try {
        const res = await fetch(logoUrl);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          this.logoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
          this.logger.log('Logo cargado como base64 correctamente');
        } else {
          this.logger.warn(
            `Logo no encontrado en R2 (${res.status}), el PDF omitirá el logo`,
          );
        }
      } catch (err) {
        this.logger.warn(
          'Error al pre-cargar logo, el PDF omitirá el logo',
          err,
        );
      }
    }
  }

  // Emite boleta para una venta. Idempotente: una venta → una boleta.
  async emitir(idVenta: number, user: JwtPayload): Promise<Boleta> {
    await this.assertVentaOwnedByUser(idVenta, user.sub);

    const existing = await this.boletaRepo.findOne({
      where: { id_venta: idVenta },
    });
    if (existing) {
      throw new ConflictException(
        `La venta ${idVenta} ya tiene boleta emitida`,
      );
    }
    const r2Config = this.getR2Config();

    const { rows, pagosRows, head, total, subtotal } =
      await this.queryDatosVenta(idVenta, user.sub);
    const numero = await this.generarNumero(head.id_sede);

    let boleta = this.boletaRepo.create({
      numero,
      id_venta: idVenta,
      id_reparacion: null,
      total,
      estado: 'emitida',
      url_pdf: null,
    });

    // Transacción: si falla PDF o R2, hace rollback y la boleta no persiste.
    await this.dataSource.transaction(async (manager) => {
      boleta = await manager.save(Boleta, boleta);
      try {
        const data = this.buildTemplateData(
          numero,
          new Date(),
          head,
          rows,
          pagosRows,
          subtotal,
          total,
        );
        const html = this.templateFn(data);
        const pdfBuffer = await this.generatePdf(html);
        const key = `boletas/ventas/${boleta.numero}.pdf`;
        await this.s3.send(
          new PutObjectCommand({
            Bucket: r2Config.bucket,
            Key: key,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
          }),
        );
        boleta.url_pdf = `${r2Config.publicUrl}/${key}`;
        await manager.save(Boleta, boleta);
      } catch (err) {
        this.logger.error('Error generando PDF o subiendo a R2', err);
        throw err;
      }
    });

    return boleta;
  }

  // Renderiza HTML con datos reales de la venta (sin PDF ni R2).
  async renderPreview(idVenta: number): Promise<string> {
    const { rows, pagosRows, head, total, subtotal } =
      await this.queryDatosVenta(idVenta);
    const data = this.buildTemplateData(
      'PREVIEW',
      new Date(),
      head,
      rows,
      pagosRows,
      subtotal,
      total,
    );
    return this.templateFn(data);
  }

  // Renderiza HTML con datos mock, sin BD. Para iterar el template en desarrollo.
  renderPreviewMock(): string {
    const data: BoletaTemplateData = {
      logoBase64: this.logoBase64,
      sedeNombre: 'Sede Central - Miraflores',
      sedeDireccion: 'Av. Larco 345, Miraflores, Lima',
      sedeTelefono: '01-234-5678',
      numero: 'B001-0000001',
      fechaEmision: new Date().toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      vendedor: 'Carlos Mendoza Ríos',
      clienteNombre: 'Ana García López',
      clienteTipoDoc: 'DNI',
      clienteNroDoc: '45678901',
      detalles: [
        {
          producto: 'Laptop ASUS VivoBook 15',
          sku: 'LAP-ASUS-VB15',
          cantidad: 1,
          precioUnitario: '2,499.00',
          importe: '2,499.00',
        },
        {
          producto: 'Mouse Logitech M170 Inalámbrico',
          sku: 'ACC-LOG-M170',
          cantidad: 2,
          precioUnitario: '45.00',
          importe: '90.00',
        },
        {
          producto: 'Mochila Targus 15.6"',
          sku: 'ACC-TRG-156',
          cantidad: 1,
          precioUnitario: '129.00',
          importe: '129.00',
        },
      ],
      subtotal: '2,718.00',
      tieneDescuento: true,
      descuento: '218.00',
      descuentoLabel: '',
      total: '2,500.00',
      pagos: [
        { metodo: 'Efectivo', monto: '500.00' },
        { metodo: 'Yape', monto: '2,000.00' },
      ],
    };
    return this.templateFn(data);
  }

  // Busca boleta por venta. Lanza 404 si no existe.
  async findByVenta(idVenta: number, user: JwtPayload): Promise<Boleta> {
    await this.assertVentaOwnedByUser(idVenta, user.sub);

    const boleta = await this.boletaRepo.findOne({
      where: { id_venta: idVenta },
    });
    if (!boleta)
      throw new NotFoundException(`No hay boleta para la venta ${idVenta}`);
    return boleta;
  }

  // Extrae y calcula todos los datos de la venta necesarios para la boleta.
  private async queryDatosVenta(
    idVenta: number,
    idEmpleado?: number,
  ): Promise<{
    rows: BolVistaRow[];
    pagosRows: PagoRow[];
    head: BolVistaRow;
    total: number;
    subtotal: number;
  }> {
    const rows = await this.dataSource.query<BolVistaRow[]>(
      `SELECT * FROM v_boleta_venta WHERE id_venta = $1${
        idEmpleado !== undefined ? ' AND id_empleado = $2' : ''
      }`,
      idEmpleado !== undefined ? [idVenta, idEmpleado] : [idVenta],
    );
    if (!rows.length)
      throw new NotFoundException(`Venta ${idVenta} no encontrada`);

    const pagosRows = await this.dataSource.query<PagoRow[]>(
      `SELECT metodo_pago, monto FROM Pagos WHERE id_venta = $1 ORDER BY fecha_pago ASC`,
      [idVenta],
    );

    const head = rows[0];
    const subtotal = rows.reduce((s, r) => s + Number(r.importe), 0);
    const descuento = Number(head.monto_descuento);
    const tipo = head.tipo_descuento;

    let total: number;
    if (tipo === 'porcentaje') {
      total = subtotal * (1 - descuento / 100);
    } else if (tipo === 'monto_fijo') {
      total = subtotal - descuento;
    } else {
      total = subtotal;
    }
    total = Math.max(0, parseFloat(total.toFixed(2)));

    return { rows, pagosRows, head, total, subtotal };
  }

  private async assertVentaOwnedByUser(
    idVenta: number,
    idEmpleado: number,
  ): Promise<void> {
    const rows = await this.dataSource.query<{ id_venta: number }[]>(
      `SELECT id_venta FROM Ventas WHERE id_venta = $1 AND id_empleado = $2`,
      [idVenta, idEmpleado],
    );
    if (!rows.length)
      throw new NotFoundException(`Venta ${idVenta} no encontrada`);
  }

  // Construye el objeto de datos para la plantilla Handlebars.
  private buildTemplateData(
    numero: string,
    fechaEmision: Date,
    head: BolVistaRow,
    rows: BolVistaRow[],
    pagosRows: PagoRow[],
    subtotal: number,
    total: number,
  ): BoletaTemplateData {
    const descuento = Number(head.monto_descuento);
    const tipo = head.tipo_descuento;

    // Descuento expresado en soles para mostrar en la plantilla.
    const descuentoSoles = tipo === 'porcentaje' ? subtotal - total : descuento;

    return {
      logoBase64: this.logoBase64,
      sedeNombre: head.sede_nombre,
      sedeDireccion: head.sede_direccion ?? '',
      sedeTelefono: head.sede_telefono ?? '',
      numero,
      fechaEmision: fechaEmision.toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      vendedor: head.vendedor,
      clienteNombre: head.cliente_nombre,
      clienteTipoDoc: head.cliente_tipo_doc,
      clienteNroDoc: head.cliente_nro_doc,
      detalles: rows.map((r) => ({
        producto: r.producto,
        sku: r.sku,
        cantidad: r.cantidad,
        precioUnitario: this.fmtMoney(Number(r.precio_unitario_momento)),
        importe: this.fmtMoney(Number(r.importe)),
      })),
      subtotal: this.fmtMoney(subtotal),
      tieneDescuento: descuento > 0,
      descuento: this.fmtMoney(descuentoSoles),
      descuentoLabel: tipo === 'porcentaje' ? `${descuento}%` : '',
      total: this.fmtMoney(total),
      pagos: pagosRows.map((p) => ({
        metodo: p.metodo_pago.charAt(0).toUpperCase() + p.metodo_pago.slice(1),
        monto: this.fmtMoney(Number(p.monto)),
      })),
    };
  }

  private fmtMoney(n: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  private getR2Config(): {
    bucket: string;
    publicUrl: string;
  } {
    const required = [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
    ] as const;

    const missing = required.filter((key) => !this.config.get<string>(key));
    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Configuración R2 incompleta: ${missing.join(', ')}`,
      );
    }

    return {
      bucket: this.config.get<string>('R2_BUCKET_NAME')!,
      publicUrl: this.config.get<string>('R2_PUBLIC_URL')!,
    };
  }

  // Genera número correlativo B{sede}-{secuencial} (ej: B001-0000001).
  private async generarNumero(idSede: number): Promise<string> {
    const prefix = `B${String(idSede).padStart(3, '0')}`;
    const rows = await this.dataSource.query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM Boletas WHERE numero LIKE $1`,
      [`${prefix}-%`],
    );
    const seq = parseInt(rows[0].total, 10) + 1;
    return `${prefix}-${String(seq).padStart(7, '0')}`;
  }

  private async generatePdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
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
