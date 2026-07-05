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
import type { JwtPayload } from '../common/types';

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

// Fila de datos de reparación para boleta (JOIN con repuestos usados).
interface BolReparacionRow {
  id_reparacion: number;
  id_sede: number;
  sede_nombre: string;
  sede_direccion: string | null;
  sede_telefono: string | null;
  tecnico: string;
  fecha_ingreso: Date;
  monto_cotizado: string | null;
  monto_descuento: string;
  tipo_descuento: string | null;
  id_cliente: number | null;
  cliente_nombre: string | null;
  cliente_tipo_doc: string | null;
  cliente_nro_doc: string | null;
  // Equipment fields
  marca: string | null;
  modelo: string | null;
  tipo_servicio: 'software' | 'hardware' | 'mixto' | null;
  diagnostico_tecnico: string | null;
  fecha_estimada: string | null;
  // Repuesto join (nullable — LEFT JOIN)
  producto: string | null;
  sku: string | null;
  cantidad: number | null;
  precio_cobrado: string | null;
  importe: string | null;
}

// Fila de datos de cambio para boleta (JOIN con items, sedes, empleados).
interface CambioBolRow {
  id_cambio: number;
  id_sede: number;
  id_empleado: number;
  cantidad: number;
  precio_devuelto: string;
  precio_entregado: string;
  diferencia_cobrada: string;
  metodo_pago_dif: string | null;
  motivo: string;
  detalle: string | null;
  fecha_cambio: Date;
  id_venta_origen: number;
  nombre_item_devuelto: string;
  sku_devuelto: string;
  nombre_item_entregado: string;
  sku_entregado: string;
  sede_nombre: string;
  sede_direccion: string | null;
  sede_telefono: string | null;
  vendedor: string;
}

// Datos inyectados en la plantilla boleta-cambio.hbs.
interface BoletaCambioTemplateData {
  logoBase64: string;
  sedeNombre: string;
  sedeDireccion: string;
  sedeTelefono: string;
  numero: string;
  fechaEmision: string;
  vendedor: string;
  itemDevuelto: {
    nombre: string;
    sku: string;
    cantidad: number;
    precio: string;
  };
  itemRecibido: {
    nombre: string;
    sku: string;
    cantidad: number;
    precio: string;
  };
  diferenciaCobrada: string;
  tieneDiferencia: boolean;
  metodoPago: string | null;
  motivo: string;
  detalle: string | null;
  idVentaOrigen: number;
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

interface BoletaReparacionTemplateData {
  logoBase64: string;
  sedeNombre: string;
  sedeDireccion: string;
  sedeTelefono: string;
  numero: string;
  fechaEmision: string;
  tecnico: string;
  clienteNombre: string | null;
  clienteTipoDoc: string | null;
  clienteNroDoc: string | null;
  equipo: string;
  tipoServicio: string;
  diagnostico: string | null;
  fechaIngreso: string;
  fechaEstimada: string | null;
  tieneRepuestos: boolean;
  repuestosSinPrecio: { nombre: string; cantidad: number }[];
  tienePrecio: boolean;
  precioServicio: string;
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
  private cambioTemplateFn: Handlebars.TemplateDelegate<BoletaCambioTemplateData>;
  private templateReparacionFn: Handlebars.TemplateDelegate<BoletaReparacionTemplateData>;
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

    const cambioSource = readFileSync(
      join(__dirname, 'templates', 'boleta-cambio.hbs'),
      'utf8',
    );
    this.cambioTemplateFn =
      Handlebars.compile<BoletaCambioTemplateData>(cambioSource);

    const repSource = readFileSync(
      join(__dirname, 'templates', 'boleta-reparacion.hbs'),
      'utf8',
    );
    this.templateReparacionFn =
      Handlebars.compile<BoletaReparacionTemplateData>(repSource);

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

  renderPreviewMockCambio(): string {
    const data: BoletaCambioTemplateData = {
      logoBase64: this.logoBase64,
      sedeNombre: 'TechStore Lima Centro',
      sedeDireccion: 'Av. Larco 345, Miraflores, Lima',
      sedeTelefono: '01-234-5678',
      numero: 'C001-0000001',
      fechaEmision: new Date().toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      vendedor: 'Luis Mamani Quispe',
      itemDevuelto: {
        nombre: 'Cable USB-C 2m',
        sku: 'CAB-USBC-2M',
        cantidad: 1,
        precio: '22.50',
      },
      itemRecibido: {
        nombre: 'Auriculares Bluetooth',
        sku: 'AUR-BT-001',
        cantidad: 1,
        precio: '85.00',
      },
      diferenciaCobrada: '62.50',
      tieneDiferencia: true,
      metodoPago: 'Efectivo',
      motivo: 'defecto',
      detalle: null,
      idVentaOrigen: 1,
    };
    return this.cambioTemplateFn(data);
  }

  // Emite boleta para reparación. Idempotente: una reparación → una boleta.
  async emitirParaReparacion(
    idReparacion: number,
    user: JwtPayload,
  ): Promise<Boleta> {
    await this.assertReparacionInSede(idReparacion, user.id_sede!);

    const existing = await this.boletaRepo.findOne({
      where: { id_reparacion: idReparacion },
    });
    if (existing) {
      throw new ConflictException(
        `La reparación ${idReparacion} ya tiene boleta emitida`,
      );
    }

    const r2Config = this.getR2Config();
    const { head, rows, pagosRows, total, subtotal } =
      await this.queryDatosReparacion(idReparacion, user.id_sede!);
    const numero = await this.generarNumero(head.id_sede);

    let boleta = this.boletaRepo.create({
      numero,
      id_venta: null,
      id_reparacion: idReparacion,
      total,
      estado: 'emitida',
      url_pdf: null,
    });

    await this.dataSource.transaction(async (manager) => {
      boleta = await manager.save(Boleta, boleta);
      try {
        const data = this.buildTemplateDataForReparacion(
          numero,
          new Date(),
          head,
          rows,
          pagosRows,
          subtotal,
          total,
        );
        const html = this.templateReparacionFn(data);
        const pdfBuffer = await this.generatePdf(html);
        const key = `boletas/reparaciones/${boleta.numero}.pdf`;
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

  // Busca boleta de una reparación. Lanza 404 si no existe.
  async findByReparacion(
    idReparacion: number,
    user: JwtPayload,
  ): Promise<Boleta> {
    await this.assertReparacionInSede(idReparacion, user.id_sede!);
    const boleta = await this.boletaRepo.findOne({
      where: { id_reparacion: idReparacion },
    });
    if (!boleta)
      throw new NotFoundException(
        `No hay boleta para la reparación ${idReparacion}`,
      );
    return boleta;
  }

  async emitirParaCambio(idCambio: number, user: JwtPayload): Promise<Boleta> {
    await this.assertCambioInSede(idCambio, user.id_sede!);

    const [cambioRow] = await this.dataSource.query<CambioBolRow[]>(
      `SELECT * FROM v_boleta_cambio WHERE id_cambio = $1 AND id_sede = $2`,
      [idCambio, user.id_sede!],
    );
    if (!cambioRow)
      throw new NotFoundException(`Cambio ${idCambio} no encontrado`);

    const existing = await this.boletaRepo.findOne({
      where: { id_cambio: idCambio },
    });
    if (existing) {
      throw new ConflictException(
        `El cambio ${idCambio} ya tiene boleta emitida`,
      );
    }

    const r2Config = this.getR2Config();
    const numero = await this.generarNumero(cambioRow.id_sede, 'C');

    let boleta = this.boletaRepo.create({
      numero,
      id_venta: null,
      id_reparacion: null,
      id_cambio: idCambio,
      total: Number(cambioRow.diferencia_cobrada),
      estado: 'emitida',
      url_pdf: null,
    });

    await this.dataSource.transaction(async (manager) => {
      boleta = await manager.save(Boleta, boleta);
      try {
        const templateData = this.buildTemplateDataForCambio(
          numero,
          new Date(),
          cambioRow,
        );
        const html = this.cambioTemplateFn(templateData);
        const pdfBuffer = await this.generatePdf(html);
        const key = `boletas/cambios/${boleta.numero}.pdf`;
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
        this.logger.error('Error generando PDF de cambio o subiendo a R2', err);
        throw err;
      }
    });

    return boleta;
  }

  async findByCambio(idCambio: number, user: JwtPayload): Promise<Boleta> {
    await this.assertCambioInSede(idCambio, user.id_sede!);

    const boleta = await this.boletaRepo.findOne({
      where: { id_cambio: idCambio },
    });
    if (!boleta)
      throw new NotFoundException(`No hay boleta para el cambio ${idCambio}`);
    return boleta;
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

  private async assertReparacionInSede(
    idReparacion: number,
    idSede: number,
  ): Promise<void> {
    const rows = await this.dataSource.query<{ id_reparacion: number }[]>(
      `SELECT id_reparacion FROM reparaciones WHERE id_reparacion = $1 AND id_sede = $2`,
      [idReparacion, idSede],
    );
    if (!rows.length)
      throw new NotFoundException(`Reparación ${idReparacion} no encontrada`);
  }

  private async assertCambioInSede(
    idCambio: number,
    idSede: number,
  ): Promise<void> {
    const rows = await this.dataSource.query<{ id_cambio: number }[]>(
      `SELECT id_cambio FROM cambios_producto WHERE id_cambio = $1 AND id_sede = $2`,
      [idCambio, idSede],
    );
    if (!rows.length)
      throw new NotFoundException(`Cambio ${idCambio} no encontrado`);
  }

  private async queryDatosReparacion(
    idReparacion: number,
    idSede: number,
  ): Promise<{
    head: BolReparacionRow;
    rows: BolReparacionRow[];
    pagosRows: PagoRow[];
    total: number;
    subtotal: number;
  }> {
    const rows = await this.dataSource.query<BolReparacionRow[]>(
      `SELECT * FROM v_boleta_reparacion WHERE id_reparacion = $1 AND id_sede = $2`,
      [idReparacion, idSede],
    );
    if (!rows.length)
      throw new NotFoundException(`Reparación ${idReparacion} no encontrada`);

    const pagosRows = await this.dataSource.query<PagoRow[]>(
      `SELECT metodo_pago, monto FROM pagos WHERE id_reparacion = $1 ORDER BY fecha_pago ASC`,
      [idReparacion],
    );

    const head = rows[0];
    // monto_cotizado = mano de obra/servicio; subtotal suma repuestos usados.
    const repuestosCost = rows.reduce(
      (s, r) => s + (r.importe !== null ? Number(r.importe) : 0),
      0,
    );
    const subtotal = Number(head.monto_cotizado ?? 0) + repuestosCost;

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

    return { head, rows, pagosRows, total, subtotal };
  }

  private buildTemplateDataForReparacion(
    numero: string,
    fechaEmision: Date,
    head: BolReparacionRow,
    rows: BolReparacionRow[],
    pagosRows: PagoRow[],
    subtotal: number,
    total: number,
  ): BoletaReparacionTemplateData {
    const descuento = Number(head.monto_descuento);
    const tipo = head.tipo_descuento;
    const descuentoSoles = tipo === 'porcentaje' ? subtotal - total : descuento;

    const equipo =
      [head.marca, head.modelo].filter(Boolean).join(' ') || 'Sin especificar';

    const tipoServicioMap: Record<string, string> = {
      software: 'Software',
      hardware: 'Hardware',
      mixto: 'Mixto',
    };
    const tipoServicio = head.tipo_servicio
      ? (tipoServicioMap[head.tipo_servicio] ?? '—')
      : '—';

    const tieneRepuestos = head.producto !== null;
    const repuestosSinPrecio = tieneRepuestos
      ? rows.map((r) => ({ nombre: r.producto!, cantidad: r.cantidad! }))
      : [];

    const tienePrecio = subtotal > 0;

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
      tecnico: head.tecnico,
      clienteNombre: head.cliente_nombre,
      clienteTipoDoc: head.cliente_tipo_doc,
      clienteNroDoc: head.cliente_nro_doc,
      equipo,
      tipoServicio,
      diagnostico: head.diagnostico_tecnico,
      fechaIngreso: new Date(head.fecha_ingreso).toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      fechaEstimada: head.fecha_estimada
        ? new Date(head.fecha_estimada + 'T00:00:00').toLocaleDateString(
            'es-PE',
            {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            },
          )
        : null,
      tieneRepuestos,
      repuestosSinPrecio,
      tienePrecio,
      precioServicio: this.fmtMoney(subtotal),
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

  private buildTemplateDataForCambio(
    numero: string,
    fechaEmision: Date,
    row: CambioBolRow,
  ): BoletaCambioTemplateData {
    return {
      logoBase64: this.logoBase64,
      sedeNombre: row.sede_nombre,
      sedeDireccion: row.sede_direccion ?? '',
      sedeTelefono: row.sede_telefono ?? '',
      numero,
      fechaEmision: fechaEmision.toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      vendedor: row.vendedor,
      itemDevuelto: {
        nombre: row.nombre_item_devuelto,
        sku: row.sku_devuelto,
        cantidad: row.cantidad,
        precio: this.fmtMoney(Number(row.precio_devuelto)),
      },
      itemRecibido: {
        nombre: row.nombre_item_entregado,
        sku: row.sku_entregado,
        cantidad: row.cantidad,
        precio: this.fmtMoney(Number(row.precio_entregado)),
      },
      diferenciaCobrada: this.fmtMoney(Number(row.diferencia_cobrada)),
      tieneDiferencia: Number(row.diferencia_cobrada) > 0,
      metodoPago: row.metodo_pago_dif
        ? row.metodo_pago_dif.charAt(0).toUpperCase() +
          row.metodo_pago_dif.slice(1)
        : null,
      motivo: row.motivo,
      detalle: row.detalle,
      idVentaOrigen: row.id_venta_origen,
    };
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

  // Genera número correlativo {prefijo}{sede}-{secuencial} (ej: B001-0000001, C001-0000001).
  private async generarNumero(
    idSede: number,
    prefijo: 'B' | 'C' = 'B',
  ): Promise<string> {
    const prefix = `${prefijo}${String(idSede).padStart(3, '0')}`;
    const rows = await this.dataSource.query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM Boletas WHERE numero LIKE $1`,
      [`${prefix}-%`],
    );
    const seq = parseInt(rows[0].total, 10) + 1;
    return `${prefix}-${String(seq).padStart(7, '0')}`;
  }

  private async generatePdf(html: string): Promise<Buffer> {
    // @sparticuz/chromium ships a Linux ELF binary — won't run on macOS natively.
    // Fall back to system Chrome on macOS or a custom path via env var.
    const isMac = process.platform === 'darwin';
    const executablePath =
      process.env.CHROMIUM_EXECUTABLE_PATH ??
      (isMac
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : await chromium.executablePath());
    const args = isMac
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      : [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ];
    const headless = isMac ? true : chromium.headless;

    const browser = await puppeteer.launch({
      args,
      executablePath,
      headless,
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
