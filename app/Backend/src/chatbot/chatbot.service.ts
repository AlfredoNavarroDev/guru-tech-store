// Servicio central del chatbot: orquesta el LLM, registra las herramientas disponibles y genera sugerencias/resúmenes por rol
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { Response } from 'express';
import type { JwtPayload } from '../common/types';
import type { ChatMessageDto } from './dto/chat-message.dto';
import { buscarProductosTool } from './tools/catalogo.tool';
import { consultarStockTool } from './tools/stock.tool';
import { buscarRepuestosTool } from './tools/repuestos.tool';
import { consultarReparacionesTool } from './tools/reparaciones.tool';
import { buscarClientesTool } from './tools/clientes.tool';
import { consultarPagosTool } from './tools/pagos.tool';
import { consultarGarantiasTool } from './tools/garantias.tool';
import { consultarVentasTool } from './tools/ventas.tool';
import { consultarDetalleVentasTool } from './tools/detalle_ventas.tool';
import { cotizarReparacionTool } from './tools/cotizar.tool';
import { consultarRendimientoEmpleadosTool } from './tools/empleados.tool';
import { consultarReposicionTool } from './tools/reposicion.tool';
import { consultarRepuestosUsadosTool } from './tools/repuestos_usados.tool';
import { consultarResumenGlobalTool } from './tools/resumen_global.tool';
import { consultarProveedoresTool } from './tools/proveedores.tool';
import { consultarComprasTool } from './tools/compras.tool';

@Injectable()
export class ChatbotService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  // Inicia el stream de texto hacia el cliente usando GPT-4o con herramientas de negocio
  async streamChat(
    dto: ChatMessageDto,
    user: JwtPayload,
    res: Response,
  ): Promise<void> {
    const openai = createOpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY')!,
    });

    const isPropietario = user.rol === 'propietario';
    const idSede = user.id_sede;

    // Herramientas completas para roles de sede (excluye abastecedor)
    const sedeToolsBase =
      idSede != null
        ? {
            buscar_productos: buscarProductosTool(this.dataSource, idSede),
            consultar_stock: consultarStockTool(this.dataSource, idSede),
            buscar_repuestos: buscarRepuestosTool(this.dataSource, idSede),
            consultar_reparaciones: consultarReparacionesTool(
              this.dataSource,
              idSede,
              user.sub,
            ),
            buscar_clientes: buscarClientesTool(this.dataSource, idSede),
            consultar_pagos: consultarPagosTool(this.dataSource, idSede),
            consultar_garantias: consultarGarantiasTool(
              this.dataSource,
              idSede,
            ),
            consultar_ventas: consultarVentasTool(this.dataSource, idSede),
            consultar_detalle_ventas: consultarDetalleVentasTool(
              this.dataSource,
              idSede,
            ),
            cotizar_reparacion: cotizarReparacionTool(this.dataSource, idSede),
            consultar_rendimiento_empleados: consultarRendimientoEmpleadosTool(
              this.dataSource,
              idSede,
            ),
            consultar_reposicion: consultarReposicionTool(
              this.dataSource,
              idSede,
            ),
            consultar_repuestos_usados: consultarRepuestosUsadosTool(
              this.dataSource,
              idSede,
            ),
          }
        : {};

    // Subconjunto de herramientas orientado al abastecedor
    const abastecedorTools =
      idSede != null
        ? {
            buscar_productos: buscarProductosTool(this.dataSource, idSede),
            consultar_stock: consultarStockTool(this.dataSource, idSede),
            buscar_repuestos: buscarRepuestosTool(this.dataSource, idSede),
            consultar_reposicion: consultarReposicionTool(
              this.dataSource,
              idSede,
            ),
            consultar_proveedores: consultarProveedoresTool(
              this.dataSource,
              idSede,
            ),
            consultar_compras: consultarComprasTool(this.dataSource, idSede),
          }
        : {};

    // El abastecedor solo accede a herramientas de gestión de stock y compras
    const sedeTools =
      user.rol === 'abastecedor' ? abastecedorTools : sedeToolsBase;

    // Solo el propietario tiene acceso a la vista global de todas las sedes
    const globalTools = isPropietario
      ? {
          consultar_resumen_global: consultarResumenGlobalTool(this.dataSource),
        }
      : {};

    const safeMessages = dto.messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant',
    );

    const result = streamText({
      model: openai('gpt-4o'),
      system: this.buildSystemPrompt(user, dto.context_page),
      messages: safeMessages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: { ...sedeTools, ...globalTools } as any,
      // Permite hasta 5 rondas de tool-calling antes de devolver la respuesta final
      maxSteps: 5,
      maxTokens: 1024,
    });

    try {
      await result.pipeDataStreamToResponse(res);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error al procesar la solicitud.' });
      }
    }
  }

  // Devuelve 4 sugerencias contextuales consultando métricas reales según el rol del usuario
  async getSuggestions(user: JwtPayload): Promise<string[]> {
    try {
      if (user.rol === 'propietario') {
        const [r] = await this.dataSource.query<
          { sedes: string; rep_activas: string }[]
        >(
          `SELECT COUNT(*)::text AS sedes,
                  COALESCE(SUM(total_reparaciones), 0)::text AS rep_activas
           FROM v_propietario_resumen_sedes`,
        );
        const sedes = parseInt(r?.sedes ?? '0', 10);
        return [
          `Dame el resumen global de las ${sedes} sedes`,
          '¿Qué sede tiene más ventas este mes?',
          '¿Cuántos empleados activos hay en total?',
          '¿Cuántas reparaciones hay activas en todas las sedes?',
        ];
      }

      if (user.id_sede == null) return [];

      if (user.rol === 'tecnico') {
        // Cuenta las reparaciones activas asignadas a este técnico para personalizar la sugerencia
        const [rep] = await this.dataSource.query<{ activas: string }[]>(
          `SELECT COUNT(*)::text AS activas
           FROM reparaciones r
           JOIN estados_reparacion er ON er.id_estado = r.id_estado
           WHERE r.id_sede = $1 AND r.id_tecnico = $2 AND er.es_final = false`,
          [user.id_sede, user.sub],
        );
        const activas = parseInt(rep?.activas ?? '0', 10);
        return [
          activas > 0
            ? `Tengo ${activas} reparacion${activas > 1 ? 'es' : ''} activa${activas > 1 ? 's' : ''}, ¿cuáles son?`
            : '¿Qué reparaciones tengo pendientes?',
          '¿Qué repuestos están disponibles?',
          'Quiero cotizar una reparación de pantalla',
          '¿Cómo llegó el equipo del último cliente?',
        ];
      }

      if (user.rol === 'vendedor') {
        // Obtiene el total de ventas del día en la sede para contextualizar la sugerencia
        const [ventas] = await this.dataSource.query<
          { total: string; ingresos: string }[]
        >(
          `SELECT COUNT(DISTINCT v.id_venta)::text AS total,
                  COALESCE(SUM(dv.importe), 0)::text AS ingresos
           FROM ventas v
           JOIN detalle_venta dv ON dv.id_venta = v.id_venta
           WHERE v.id_sede = $1 AND DATE(v.fecha_emision AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date`,
          [user.id_sede],
        );
        const totalHoy = parseInt(ventas?.total ?? '0', 10);
        return [
          totalHoy > 0
            ? `Se hicieron ${totalHoy} venta${totalHoy > 1 ? 's' : ''} hoy en la sede, ¿cuánto sumamos?`
            : '¿Cuánto hemos vendido hoy?',
          '¿Qué productos tenemos disponibles?',
          '¿Hay alguna promoción activa?',
          '¿Qué productos tienen bajo stock?',
        ];
      }

      if (user.rol === 'abastecedor') {
        // Cuenta ítems en estado crítico o sin stock para mostrar una alerta en la sugerencia
        const [stock] = await this.dataSource.query<
          { critico: string; sin_stock: string }[]
        >(
          `SELECT
             COUNT(*) FILTER (WHERE cantidad_actual > 0 AND cantidad_actual <= stock_minimo)::text AS critico,
             COUNT(*) FILTER (WHERE cantidad_actual = 0)::text AS sin_stock
           FROM inventario_sedes
           WHERE id_sede = $1`,
          [user.id_sede],
        );
        const critico = parseInt(stock?.critico ?? '0', 10);
        const sinStock = parseInt(stock?.sin_stock ?? '0', 10);
        const alertas = critico + sinStock;
        return [
          alertas > 0
            ? `Hay ${alertas} ítem${alertas > 1 ? 's' : ''} con stock bajo o agotado, ¿cuáles son?`
            : '¿Qué ítems requieren reposición?',
          '¿Cuáles son los productos sin stock?',
          'Muéstrame el historial de reposiciones recientes',
          '¿Cuánto costó la última compra de stock?',
        ];
      }

      // admin / default
      const [rep] = await this.dataSource.query<{ activas: string }[]>(
        `SELECT COUNT(*)::text AS activas
         FROM reparaciones r
         JOIN estados_reparacion er ON er.id_estado = r.id_estado
         WHERE r.id_sede = $1 AND er.es_final = false`,
        [user.id_sede],
      );
      const activas = parseInt(rep?.activas ?? '0', 10);
      return [
        activas > 0
          ? `Hay ${activas} reparacion${activas > 1 ? 'es' : ''} activas en la sede`
          : '¿Cuál es el estado de las reparaciones?',
        '¿Cuánto hemos vendido este mes?',
        '¿Cuál es el stock actual de la sede?',
        '¿Qué productos tienen mayor disponibilidad?',
      ];
    } catch {
      // Si falla la BD se devuelven sugerencias genéricas para no bloquear la UI
      return [
        '¿Qué puedes hacer?',
        '¿Cuál es el stock actual?',
        '¿Qué reparaciones hay activas?',
        '¿Cuánto hemos vendido hoy?',
      ];
    }
  }

  // Genera el texto de bienvenida con métricas del día adaptado al rol del usuario
  async getResumenDiario(user: JwtPayload): Promise<string> {
    const fechaLabel = new Date().toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Lima',
    });

    try {
      if (user.rol === 'propietario') {
        const sedes = await this.dataSource.query<
          {
            sede: string;
            empleados_activos: string;
            total_ventas: string;
            ingresos_ventas: string;
            total_reparaciones: string;
            ingresos_reparaciones: string;
          }[]
        >(
          `SELECT sede, empleados_activos::text, total_ventas::text,
                  ingresos_ventas::text, total_reparaciones::text, ingresos_reparaciones::text
           FROM v_propietario_resumen_sedes
           ORDER BY sede`,
        );
        // Acumula totales globales sumando los valores de cada sede
        const totalVentas = sedes.reduce(
          (s, r) => s + parseInt(r.total_ventas ?? '0', 10),
          0,
        );
        const totalRep = sedes.reduce(
          (s, r) => s + parseInt(r.total_reparaciones ?? '0', 10),
          0,
        );
        const totalIngresos = sedes.reduce(
          (s, r) =>
            s +
            parseFloat(r.ingresos_ventas ?? '0') +
            parseFloat(r.ingresos_reparaciones ?? '0'),
          0,
        );
        const sedesLines = sedes
          .map(
            (s) =>
              `  - **${s.sede}**: ${s.total_ventas} ventas · ${s.total_reparaciones} reparaciones`,
          )
          .join('\n');
        return (
          `**Resumen global — ${fechaLabel}**\n\n` +
          `- Sedes activas: **${sedes.length}**\n` +
          `- Ventas totales (acumulado): **${totalVentas}**\n` +
          `- Reparaciones totales: **${totalRep}**\n` +
          `- Ingresos acumulados: **S/ ${totalIngresos.toFixed(2)}**\n\n` +
          `**Por sede:**\n${sedesLines}`
        );
      }

      if (user.id_sede == null)
        return `Bienvenido, ${user.nombre}. ¿En qué puedo ayudarte hoy?`;

      if (user.rol === 'tecnico') {
        // Distingue entre todas las activas en la sede y las asignadas al técnico en sesión
        const [rep] = await this.dataSource.query<
          {
            activas: string;
            mias_activas: string;
            entregadas_hoy: string;
          }[]
        >(
          `SELECT
             COUNT(*) FILTER (WHERE er.es_final = false)::text AS activas,
             COUNT(*) FILTER (WHERE er.es_final = false AND r.id_tecnico = $2)::text AS mias_activas,
             COUNT(*) FILTER (WHERE er.es_final = true AND DATE(r.fecha_terminado) = CURRENT_DATE)::text AS entregadas_hoy
           FROM reparaciones r
           JOIN estados_reparacion er ON er.id_estado = r.id_estado
           WHERE r.id_sede = $1`,
          [user.id_sede, user.sub],
        );
        const activas = parseInt(rep?.activas ?? '0', 10);
        const mias = parseInt(rep?.mias_activas ?? '0', 10);
        const entregadas = parseInt(rep?.entregadas_hoy ?? '0', 10);
        return (
          `**Resumen del día — ${fechaLabel}**\n\n` +
          `- Reparaciones activas en la sede: **${activas}**\n` +
          `- Mis reparaciones activas: **${mias}**\n` +
          `- Equipos entregados hoy: **${entregadas}**`
        );
      }

      if (user.rol === 'vendedor') {
        const [v] = await this.dataSource.query<
          {
            ventas: string;
            ingresos: string;
          }[]
        >(
          `SELECT COUNT(DISTINCT v.id_venta)::text AS ventas,
                  COALESCE(SUM(dv.importe), 0)::text AS ingresos
           FROM ventas v
           JOIN detalle_venta dv ON dv.id_venta = v.id_venta
           WHERE v.id_sede = $1 AND DATE(v.fecha_emision AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date`,
          [user.id_sede],
        );
        const ventas = parseInt(v?.ventas ?? '0', 10);
        const ingresos = parseFloat(v?.ingresos ?? '0');
        return (
          `**Resumen del día — ${fechaLabel}**\n\n` +
          `- Ventas realizadas hoy: **${ventas}**\n` +
          `- Ingresos del día: **S/ ${ingresos.toFixed(2)}**`
        );
      }

      if (user.rol === 'abastecedor') {
        const [s] = await this.dataSource.query<
          {
            critico: string;
            sin_stock: string;
          }[]
        >(
          `SELECT
             COUNT(*) FILTER (WHERE cantidad_actual > 0 AND cantidad_actual <= stock_minimo)::text AS critico,
             COUNT(*) FILTER (WHERE cantidad_actual = 0)::text AS sin_stock
           FROM inventario_sedes
           WHERE id_sede = $1`,
          [user.id_sede],
        );
        const critico = parseInt(s?.critico ?? '0', 10);
        const sinStock = parseInt(s?.sin_stock ?? '0', 10);
        return (
          `**Resumen del día — ${fechaLabel}**\n\n` +
          `- Productos con stock crítico: **${critico}**\n` +
          `- Productos sin stock: **${sinStock}**`
        );
      }

      // admin / default: combina reparaciones activas y ventas del día en una sola query
      const [r] = await this.dataSource.query<
        {
          rep_activas: string;
          ventas_hoy: string;
          ingresos_hoy: string;
        }[]
      >(
        `SELECT
           (SELECT COUNT(*)::text FROM reparaciones r2
            JOIN estados_reparacion er ON er.id_estado = r2.id_estado
            WHERE r2.id_sede = $1 AND er.es_final = false) AS rep_activas,
           COUNT(DISTINCT v.id_venta)::text AS ventas_hoy,
           COALESCE(SUM(dv.importe), 0)::text AS ingresos_hoy
         FROM ventas v
         JOIN detalle_venta dv ON dv.id_venta = v.id_venta
         WHERE v.id_sede = $1 AND DATE(v.fecha_emision AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date`,
        [user.id_sede],
      );
      const repActivas = parseInt(r?.rep_activas ?? '0', 10);
      const ventasHoy = parseInt(r?.ventas_hoy ?? '0', 10);
      const ingresosHoy = parseFloat(r?.ingresos_hoy ?? '0');
      return (
        `**Resumen del día — ${fechaLabel}**\n\n` +
        `- Reparaciones activas: **${repActivas}**\n` +
        `- Ventas hoy: **${ventasHoy}** (S/ ${ingresosHoy.toFixed(2)})`
      );
    } catch {
      return `Bienvenido, ${user.nombre}. ¿En qué puedo ayudarte hoy?`;
    }
  }

  // Construye el system prompt del LLM con identidad, permisos y herramientas según el rol
  private buildSystemPrompt(user: JwtPayload, contextPage?: string): string {
    const rolDescripcion: Record<string, string> = {
      tecnico: 'técnico',
      vendedor: 'vendedor',
      abastecedor: 'abastecedor',
      administrador: 'administrador',
      propietario: 'propietario',
    };
    const rolLabel = rolDescripcion[user.rol] ?? user.rol;
    const isPropietario = user.rol === 'propietario';
    const isAbastecedor = user.rol === 'abastecedor';

    const PAGE_LABELS: Record<string, string> = {
      '/dashboard': 'Panel principal',
      '/dashboard/cambios': 'Historial de cambios',
      '/dashboard/cambios/nuevo': 'Nuevo cambio',
      '/dashboard/ventas': 'Ventas',
      '/dashboard/reparaciones': 'Reparaciones',
      '/dashboard/clientes': 'Clientes',
      '/dashboard/catalogo': 'Catálogo',
      '/dashboard/empleados': 'Empleados',
      '/dashboard/reposicion': 'Reposición de stock',
    };
    const safeContext = contextPage
      ? (PAGE_LABELS[contextPage] ?? undefined)
      : undefined;

    const contextLine = safeContext
      ? `\n\nCONTEXTO ACTUAL: El usuario está viendo la pantalla "${safeContext}". Adapta tu respuesta a ese contexto cuando sea relevante.`
      : '';

    const sedeInfo = isPropietario
      ? 'Tienes acceso global a todas las sedes del negocio.'
      : 'Todos los datos que consultes pertenecen exclusivamente a su sede.';

    // El bloque de herramientas varía según si es propietario (global), abastecedor o empleado de sede
    const herramientas = isPropietario
      ? `HERRAMIENTAS DISPONIBLES:
- consultar_resumen_global: muestra resumen de todas las sedes — ventas, reparaciones, ingresos y empleados activos. Con incluir_empleados=true lista empleados por sede. Úsalo para comparar sedes, ver el estado general del negocio o preguntas sobre rendimiento global.`
      : isAbastecedor
        ? `HERRAMIENTAS DISPONIBLES:
- buscar_productos: busca productos del catálogo de la sede por nombre, marca o modelo. Devuelve precio, stock y foto. Cuando el usuario pida ver una imagen del producto, muéstrala en markdown: ![nombre](imagen_url).
- consultar_stock: consulta el stock actual de un ítem por SKU.
- buscar_repuestos: busca repuestos disponibles en la sede.
- consultar_reposicion: consulta ítems con stock bajo o agotado. Con ver_historial=true muestra las últimas 5 compras. Úsalo para saber qué comprar, qué falta o cuánto costó la última reposición.
- consultar_proveedores: lista los proveedores registrados y sus métricas en esta sede (órdenes realizadas, total comprado, última compra). Filtra por nombre o RUC. Úsalo cuando pregunten qué proveedores hay, cuál se usa más o cuánto se les ha comprado.
- consultar_compras: historial de compras de reposición de la sede. Filtra por proveedor, ítem y periodo (hoy/semana/mes/año). Con ver_detalle=true muestra los ítems línea a línea. Úsalo para saber qué se compró, cuánto se gastó o compras por proveedor.`
        : `HERRAMIENTAS DISPONIBLES:
- buscar_productos: busca productos del catálogo de la sede. Devuelve imagen_url — cuando el usuario pida ver el producto o imagen, inclúyela en markdown: ![nombre](imagen_url). Solo muestra imagen si imagen_url no es null.
- consultar_stock: consulta niveles de stock en la sede.
- buscar_repuestos: busca repuestos disponibles.
- buscar_clientes: busca clientes por nombre o documento. Devuelve datos personales, teléfono, dirección, fecha de registro y resumen de reparaciones. Úsalo cuando pidan "datos del cliente", "información de X", "quién es X", etc.
- consultar_pagos: consulta pagos de reparaciones filtrado por nombre de cliente y/o modelo de dispositivo. Devuelve monto pagado, método, si es adelanto y total acumulado. Úsalo cuando pregunten cuánto ha pagado un cliente, montos de una reparación, historial de pagos.
- consultar_garantias: consulta garantías (de reparaciones y ventas) filtrando por cliente, estado (activa/vencida/invalidada) y modelo. Úsalo cuando pregunten si un cliente tiene garantía, si está vigente, cuándo vence o por qué fue invalidada.
- consultar_ventas: consulta ventas de la sede por periodo (hoy/semana/mes) o fechas personalizadas. Con top_productos=true devuelve ranking de productos más vendidos. Úsalo para preguntas de ingresos totales, cuánto se vendió hoy/semana/mes, qué productos se venden más.
- consultar_detalle_ventas: devuelve ventas individuales con cliente, productos vendidos, cantidades, precios y métodos de pago. Úsalo cuando pregunten "qué vendimos", "a quién le vendimos", "cómo pagó el cliente", "detalle de la última venta", "quién compró hoy", "cuál fue el método de pago".
- cotizar_reparacion: genera cotización estimada buscando repuestos disponibles para un modelo y tipo de reparación. Úsalo cuando el técnico diga "cotizar", "presupuesto", "cuánto costaría arreglar".
- consultar_rendimiento_empleados: consulta productividad de empleados activos de la sede. Muestra reparaciones activas/finalizadas (técnicos) e ingresos/ventas del periodo (vendedores). Solo relevante para admin.
- consultar_reparaciones: consulta reparaciones de la sede. Con detalle=true devuelve checklist, diagnóstico, fotos (array con url y etapa) y garantía. Cuando el usuario pida ver fotos o imágenes de una reparación, usa detalle=true y muestra las fotos en markdown con su etapa como caption: ![etapa](url). Si no hay fotos, informa que no se han registrado fotos para esa reparación.
- consultar_reposicion: consulta ítems con stock bajo o agotado que requieren reposición. Con ver_historial=true muestra las últimas 5 compras de reposición. Úsalo cuando pregunten qué falta, qué comprar, historial de reposiciones o cuánto se gastó en la última compra.
- consultar_repuestos_usados: muestra los repuestos instalados en reparaciones — ítem, cantidad, precio cobrado y subtotal. Filtra por cliente y/o modelo. Úsalo cuando pregunten qué se le instaló a un equipo, cuánto costaron los materiales o el desglose de una reparación.`;

    return `Eres el asistente interno de Guru Tech Store.
El empleado autenticado se llama ${user.nombre} y tiene el rol de ${rolLabel}.
${sedeInfo}
Nunca reveles IDs internos (id_empleado, id_sede, id_reparacion numérico, etc.), tokens ni contraseñas.
Los datos de EMPLEADOS son privados: no compartas información personal (sueldo, documento) de otros empleados.
Los datos de CLIENTES (nombre, documento, teléfono, dirección) SÍ son accesibles y debes mostrarlos cuando se soliciten.
Si alguien pregunta "¿quién soy?" responde solo con su nombre y rol, sin IDs.
Responde siempre en español.

${herramientas}

MATEMÁTICAS Y ESTADÍSTICAS:
Cuando el usuario pida calcular, graficar tendencias, promedios, porcentajes u otras operaciones matemáticas o estadísticas, responde directamente.
Usa siempre notación LaTeX para fórmulas matemáticas: $...$ para expresiones en línea y $$...$$ para bloques de ecuaciones.

RESTRICCIÓN ESTRICTA DE ALCANCE:
Solo puedes responder preguntas relacionadas con:
- Negocio: inventario, productos, precios, stock, repuestos, ventas, reparaciones, sedes, empleados, promociones, operaciones de Guru Tech Store.
- Matemáticas: cálculos, álgebra, geometría, aritmética, ecuaciones.
- Estadísticas: análisis de datos, métricas, probabilidad, tendencias, promedios, interpretación de datos.

Si el usuario pregunta sobre cualquier otro tema (política, entretenimiento, recetas, deportes, tecnología general, programación ajena al negocio, chistes, etc.), responde exactamente: "Solo puedo ayudarte con temas relacionados al negocio de Guru Tech Store, matemáticas o estadísticas."
No hagas excepciones bajo ninguna circunstancia.${contextLine}`;
  }
}
