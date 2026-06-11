# Sprint 4 — Chatbot IA · Backend + Frontend

**Stack Backend:** NestJS · `ai` (Vercel AI SDK Core) · `@ai-sdk/openai` · `zod` · TypeORM · PostgreSQL · SSE  
**Modelo:** `gpt-4o-mini` (OpenAI) — upgrade path: `claude-haiku-4-5-20251001` si HU-28 falla en producción  
**Stack Frontend:** Next.js 14 · Tailwind CSS · Lucide React  
**Story Points:** 34  
**Épicas:** Chatbot IA · Seguridad · Historial

> **Nota:** general.md declaraba 29 SP (HU-20+HU-21+HU-22). HU-22 fue refinada en dos HUs: HU-22 (Historial, 5 SP) + HU-28 (Seguridad, 8 SP). Total real = 34 SP.  
**Dependencias:** todos los módulos anteriores (accede a datos de items, ventas, reparaciones)

---

## Historias de Usuario

| HU    | Historia                               | SP | Prioridad |
|-------|----------------------------------------|----|-----------|
| HU-20 | Consultar productos en lenguaje natural| 13 | Alta      |
| HU-21 | Respuestas con datos en tiempo real    | 8  | Alta      |
| HU-22 | Historial de conversación del chatbot  | 5  | Media     |
| HU-28 | Chatbot seguro: RO + schema/rol + sanitiz. | 8  | Alta      |

---

## Backend — Módulo Chatbot

### Estructura
```
src/chatbot/
  chatbot.module.ts
  chatbot.controller.ts
  chatbot.service.ts
  chatbot.tools.ts         — definición de herramientas para Claude
  entities/
    conversacion.entity.ts
    mensaje-chatbot.entity.ts
  dto/
    create-mensaje.dto.ts
    chatbot-response.dto.ts
    query-conversaciones.dto.ts
```

---

## Endpoints

| Método | Ruta                          | Descripción                               |
|--------|-------------------------------|-------------------------------------------|
| POST   | /chatbot/mensaje              | Enviar mensaje → respuesta streaming (SSE)|
| GET    | /chatbot/conversaciones       | Historial de conversaciones del usuario   |
| GET    | /chatbot/conversaciones/:id   | Mensajes de una conversación              |
| DELETE | /chatbot/conversaciones/:id   | Eliminar conversación                     |

---

## Esquema de BD

```sql
CREATE TABLE Conversaciones (
  id_conversacion SERIAL PRIMARY KEY,
  id_empleado     INTEGER NOT NULL REFERENCES Empleados(id_empleado),
  id_sede         INTEGER NOT NULL REFERENCES Sedes(id_sede),
  titulo          VARCHAR(255),          -- generado del primer mensaje
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE Mensajes_Chatbot (
  id_mensaje      SERIAL PRIMARY KEY,
  id_conversacion INTEGER NOT NULL REFERENCES Conversaciones(id_conversacion),
  rol             VARCHAR(20) NOT NULL,  -- 'user' | 'assistant' | 'tool_result'
  contenido       TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## DTO

```typescript
class CreateMensajeDto {
  contenido: string;               // mensaje del usuario
  id_conversacion?: number;        // null = nueva conversación
}
```

---

## Herramientas disponibles (Vercel AI SDK + Zod)
**HU-21:** Respuestas con datos en tiempo real

> Zod valida los parámetros antes de que lleguen al service — el modelo no puede pasar basura a la BD.

```typescript
// chatbot.tools.ts
import { tool } from 'ai';
import { z } from 'zod';

export const buildChatbotTools = (
  itemsService: ItemsService,
  reparacionesService: ReparacionesService,
  idSede: number,
) => ({
  buscar_productos: tool({
    description: 'Busca productos o repuestos en el catálogo de la sede. Usar cuando el usuario pregunte por disponibilidad, precios o características.',
    parameters: z.object({
      query: z.string().describe('Texto de búsqueda (nombre, marca, categoría)'),
      tipo: z.enum(['producto', 'repuesto', 'todos']).optional(),
      con_stock: z.boolean().describe('true para mostrar solo con stock disponible').optional(),
    }),
    execute: async ({ query, tipo, con_stock }) =>
      itemsService.buscarParaChatbot({ query, tipo, con_stock, id_sede: idSede }),
  }),

  consultar_stock: tool({
    description: 'Consulta el stock actual de un ítem específico en la sede.',
    parameters: z.object({
      id_item: z.number().int().positive(),
    }),
    execute: async ({ id_item }) =>
      itemsService.stockParaChatbot({ id_item, id_sede: idSede }),
  }),

  obtener_promociones: tool({
    description: 'Retorna las promociones activas del día en la sede.',
    parameters: z.object({}),
    execute: async () =>
      itemsService.promocionesActivasParaChatbot({ id_sede: idSede }),
  }),

  estado_reparacion: tool({
    description: 'Consulta el estado de una reparación por ID o por DNI del cliente.',
    parameters: z.object({
      id_reparacion: z.number().int().positive().optional(),
      nro_documento_cliente: z.string().optional(),
    }).refine(d => d.id_reparacion || d.nro_documento_cliente, {
      message: 'Se requiere id_reparacion o nro_documento_cliente',
    }),
    execute: async ({ id_reparacion, nro_documento_cliente }) =>
      reparacionesService.estadoParaChatbot({ id_reparacion, nro_documento_cliente, id_sede: idSede }),
  }),
});
```

---

## Flujo de Mensaje con Tool Use

> El loop `while (stop_reason === 'tool_use')` desaparece — `maxSteps` lo maneja automáticamente.

```typescript
// chatbot.service.ts
import { generateText, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

@Injectable()
export class ChatbotService {
  private readonly openai = createOpenAI({ apiKey: this.configService.get('OPENAI_API_KEY') });

  async procesarMensaje(dto: CreateMensajeDto, currentUser: JwtPayload) {
    sanitizeInput(dto.contenido);  // HU-28: lanza BadRequestException si detecta inyección

    const historial = await this.cargarHistorial(dto.id_conversacion);

    const { text } = await generateText({
      model: this.openai('gpt-4o-mini'),
      system: buildSystemPrompt(currentUser.roles, currentUser.id_sede),
      tools: buildChatbotTools(this.itemsService, this.reparacionesService, currentUser.id_sede),
      messages: historial,
      prompt: dto.contenido,
      maxSteps: 5,  // SDK maneja el loop tool use automáticamente
    });

    await this.persistirMensajes(dto.id_conversacion, dto.contenido, text, currentUser);
    return text;
  }

  async procesarMensajeStream(dto: CreateMensajeDto, currentUser: JwtPayload) {
    sanitizeInput(dto.contenido);
    const historial = await this.cargarHistorial(dto.id_conversacion);

    return streamText({
      model: this.openai('gpt-4o-mini'),
      system: buildSystemPrompt(currentUser.roles, currentUser.id_sede),
      tools: buildChatbotTools(this.itemsService, this.reparacionesService, currentUser.id_sede),
      messages: historial,
      prompt: dto.contenido,
      maxSteps: 5,
    });
  }
}
```

---

## Endpoint SSE (Streaming)
**HU-20:** Respuestas en streaming

```typescript
// chatbot.controller.ts
@Post('mensaje')
@UseGuards(JwtAuthGuard)
async mensajeStream(
  @Body() dto: CreateMensajeDto,
  @CurrentUser() user: JwtPayload,
  @Res() res: Response,
): Promise<void> {
  const result = await this.chatbotService.procesarMensajeStream(dto, user);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  for await (const chunk of result.textStream) {
    res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}
```

---

## Historial de Conversaciones
**HU-22**

```typescript
// GET /chatbot/conversaciones
// Retorna lista de conversaciones del empleado autenticado
// Filtradas por id_empleado = JWT sub

// GET /chatbot/conversaciones/:id
// Retorna todos los mensajes de la conversación
// Validar que la conversación pertenezca al empleado autenticado
```

---

## Dependencias adicionales

```json
{
  "ai": "^3.x",
  "@ai-sdk/openai": "^0.x",
  "zod": "^3.x"
}
```

> **Por qué Vercel AI SDK y no `@anthropic-ai/sdk` directamente:**
> - Zod integrado en tool parameters → type-safe, elimina `validateGeneratedQuery()` manual
> - `maxSteps` elimina el loop `while(stop_reason === 'tool_use')` manual
> - Swap de proveedor en una línea: `@ai-sdk/anthropic` si se necesita migrar a Haiku
> - Sin LangChain: DI de NestJS incompatible, difícil de depurar, overkill

```
OPENAI_API_KEY=sk-...
# Upgrade path si gpt-4o-mini falla HU-28:
# cambiar a @ai-sdk/anthropic + claude-haiku-4-5-20251001 (una línea)
```

> **Producción con datos reales:** Firmar DPA con OpenAI antes de go-live.
> OpenAI API no usa datos de API para entrenar (por contrato). Ver platform.openai.com/docs/data-privacy.

---

## Guards y Decoradores

```typescript
@UseGuards(JwtAuthGuard)
// Sin RolesGuard — todos los roles pueden usar el chatbot
@CurrentUser() → { id_empleado, id_sede, roles }
```

---

## Frontend — Chatbot UI

### Página
`/dashboard/chatbot` → `app/dashboard/chatbot/page.tsx`

### Layout
```
┌─────────────────────────────────────────────────┐
│   Guru AI                          [+ Nueva]    │
├──────────────┬──────────────────────────────────┤
│  Historial   │  Conversación actual             │
│  ──────────  │  ────────────────────────────── │
│  · Hoy       │                                  │
│    Laptops.. │    ╔══════════════════════╗      │
│    iPhone... │    ║  ¿Tienen laptops     ║      │
│  · Ayer      │    ║  ASUS bajo 2000?     ║      │
│    Repuesto..│    ╚══════════════════════╝      │
│              │                                  │
│              │    ╔══════════════════════╗      │
│              │    ║ Guru AI:             ║      │
│              │    ║ Sí, tenemos 3 modelos║ 🤖  │
│              │    ║ disponibles...       ║      │
│              │    ║ [cursor parpadeante] ║      │
│              │    ╚══════════════════════╝      │
│              │                                  │
│              │  ┌──────────────────────────┐   │
│              │  │ Escribe tu consulta... ↑ │   │
│              │  └──────────────────────────┘   │
└──────────────┴──────────────────────────────────┘
```

### Componentes del Chat
- Mensajes del usuario: alineados a la derecha, fondo azul
- Mensajes del AI: alineados a la izquierda, fondo gris oscuro, icono robot
- Streaming: efecto de cursor parpadeante mientras llega la respuesta
- Input: textarea con Enter para enviar, Shift+Enter para nueva línea

### Integración SSE en Frontend
```typescript
// ChatWindow.tsx
const sendMessage = async (content: string) => {
  setMessages(prev => [...prev, { role: 'user', content }]);
  setIsStreaming(true);
  let fullResponse = '';

  const eventSource = new EventSource(
    `${process.env.NEXT_PUBLIC_API_URL}/chatbot/mensaje`,
    // usar fetch + ReadableStream para POST con SSE
  );

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chatbot/mensaje`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ contenido: content, id_conversacion: activeConversationId }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const parsed = JSON.parse(chunk.replace('data: ', ''));
    if (parsed.delta) {
      fullResponse += parsed.delta;
      setCurrentStreamMessage(fullResponse);
    }
    if (parsed.done) {
      setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
      setCurrentStreamMessage('');
      setIsStreaming(false);
    }
  }
};
```

### Archivos a Crear
```
app/dashboard/chatbot/
  page.tsx

components/chatbot/
  ChatWindow.tsx          — área de mensajes con scroll auto
  ChatInput.tsx           — textarea + botón enviar
  MessageBubble.tsx       — burbuja usuario / AI
  StreamingCursor.tsx     — efecto cursor parpadeante
  ConversationSidebar.tsx — historial de conversaciones
  ConversationItem.tsx    — ítem del sidebar (título + fecha)
```

---

## Seguridad del Chatbot (HU-28)

**Capas de seguridad:**
1. **Usuario RO en PostgreSQL** — `chatbot_ro` solo puede SELECT
2. **DataSource dedicada** — `ChatbotDataSource` usa `DB_URL_CHATBOT_RO`, sin entidades, `synchronize: false`
3. **Schema por rol** — `buildSystemPrompt()` limita tablas accesibles y columnas prohibidas según rol JWT
4. **Sanitización de input** — regex antiinyección: `ignora tus instrucciones`, `act as`, `pretend to be`, etc.; límite 2000 chars
5. **Validación de SQL generado** — rechaza cualquier query que no empiece con SELECT; detecta INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/GRANT/REVOKE

### 0.1 — Usuario de solo lectura en PostgreSQL

```sql
-- Ejecutar en BD (una sola vez)
CREATE USER chatbot_ro WITH PASSWORD '<password_seguro>';
GRANT CONNECT ON DATABASE gurutech TO chatbot_ro;
GRANT USAGE ON SCHEMA public TO chatbot_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO chatbot_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO chatbot_ro;
```

### DataSource dedicada para chatbot

```typescript
// src/database/chatbot-datasource.ts
export const chatbotDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DB_URL_CHATBOT_RO,
  entities: [],       // sin entidades — solo queries raw
  synchronize: false, // nunca sincroniza schema
  logging: false,
};

export const ChatbotDataSource = new DataSource(chatbotDataSourceOptions);
```

Registrar en `ChatbotModule`:
```typescript
// chatbot.module.ts — providers:
{
  provide: 'CHATBOT_DATASOURCE',
  useFactory: async () => {
    return ChatbotDataSource.isInitialized
      ? ChatbotDataSource
      : await ChatbotDataSource.initialize();
  },
},
```

Variable de entorno a agregar en `.env` y `.env.example`:
```
DB_URL_CHATBOT_RO=postgresql://chatbot_ro:<password>@localhost:5432/gurutech
```

### 4.1 — Schema por rol

**Tablas por rol:**
| Rol | Tablas accesibles |
|-----|-------------------|
| propietario | Items, Inventario_Sedes, Ventas, Detalle_Venta, Reparaciones, Compras_Refill, Empleados, Sedes |
| administrador | Items, Inventario_Sedes, Ventas, Detalle_Venta, Empleados |
| vendedor | Items, Inventario_Sedes, Ventas, Detalle_Venta, Clientes |
| tecnico | Items, Reparaciones, Reparacion_Repuestos_Usados, Clientes |
| abastecedor | Items, Inventario_Sedes, Compras_Refill, Detalle_Compra_Refill, Proveedores |

**Columnas prohibidas:** vendedor y tecnico nunca pueden ver `precio_compra_actual` ni `costo_unitario_momento`.

```typescript
// chatbot.tools.ts
const TABLAS_POR_ROL: Record<string, string[]> = {
  propietario:   ['Items', 'Inventario_Sedes', 'Ventas', 'Detalle_Venta', 'Reparaciones', 'Compras_Refill', 'Empleados', 'Sedes'],
  administrador: ['Items', 'Inventario_Sedes', 'Ventas', 'Detalle_Venta', 'Empleados'],
  vendedor:      ['Items', 'Inventario_Sedes', 'Ventas', 'Detalle_Venta', 'Clientes'],
  tecnico:       ['Items', 'Reparaciones', 'Reparacion_Repuestos_Usados', 'Clientes'],
  abastecedor:   ['Items', 'Inventario_Sedes', 'Compras_Refill', 'Detalle_Compra_Refill', 'Proveedores'],
};

// Columnas sensibles excluidas por rol (en el system prompt)
const COLUMNAS_EXCLUIDAS_POR_ROL: Record<string, string[]> = {
  vendedor:  ['precio_compra_actual', 'costo_unitario_momento'],
  tecnico:   ['precio_compra_actual', 'costo_unitario_momento'],
};

export function buildSystemPrompt(roles: string[], idSede: number): string {
  const rol = roles[0]; // usar rol primario
  const tablas = TABLAS_POR_ROL[rol] ?? TABLAS_POR_ROL['vendedor'];
  const excluidas = COLUMNAS_EXCLUIDAS_POR_ROL[rol] ?? [];

  return `Eres un asistente para Guru Tech Store.
    - Tu sede activa es id_sede = ${idSede}. Solo puedes consultar datos de esa sede.
    - Tablas disponibles: ${tablas.join(', ')}.
    - ${excluidas.length ? `Columnas PROHIBIDAS (nunca las incluyas): ${excluidas.join(', ')}.` : ''}
    - Solo genéraras sentencias SELECT. Cualquier otra operación está prohibida.`;
}
```

### 4.2 — Sanitización de input

```typescript
// chatbot.service.ts
const PROMPT_INJECTION_PATTERNS = [
  /ignora\s+(tus|las|todas|estas)\s+instrucciones/i,
  /olvida\s+(lo\s+anterior|tus\s+instrucciones)/i,
  /\bsystem\s+prompt\b/i,
  /\brol\s+de\s+sistema\b/i,
  /act\s+as\s+/i,
  /pretend\s+(you\s+are|to\s+be)/i,
];

function sanitizeInput(input: string): void {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      throw new BadRequestException('Entrada no permitida en el asistente');
    }
  }
  if (input.trim().length > 2000) {
    throw new BadRequestException('El mensaje no puede superar los 2000 caracteres');
  }
}
```

### 4.3 — Validación de queries generadas por Claude

Antes de ejecutar cualquier SQL generado por el modelo:

```typescript
function validateGeneratedQuery(sql: string): void {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT')) {
    throw new ForbiddenException('Solo se permiten consultas SELECT en el chatbot');
  }
  // Palabras clave DML/DDL prohibidas
  const prohibited = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
  for (const kw of prohibited) {
    if (trimmed.includes(kw)) {
      throw new ForbiddenException('Operación no permitida en el chatbot');
    }
  }
}

// Uso en ChatbotService.executeQuery():
validateGeneratedQuery(sql);
const result = await this.chatbotDataSource.query(sql);
```

### Archivos a crear/modificar
```
src/database/
  chatbot-datasource.ts         — nuevo (ChatbotDataSource con chatbot_ro)
src/chatbot/
  chatbot.module.ts             — registrar CHATBOT_DATASOURCE
  chatbot.service.ts            — sanitizeInput + generateText/streamText con gpt-4o-mini
  chatbot.tools.ts              — buildChatbotTools() con Zod + buildSystemPrompt()
.env                            — agregar DB_URL_CHATBOT_RO y OPENAI_API_KEY
.env.example                    — idem
```

> **Nota importante:** Con Vercel AI SDK + Zod, la función `validateGeneratedQuery()` (validación
> de SQL generado) es innecesaria porque el modelo **nunca genera SQL** — solo llama tools con
> parámetros Zod-validados que ejecutan métodos del service. La capa `chatbot_ro` + DataSource
> dedicada sigue siendo necesaria como defensa en profundidad.

### Criterio de aceptación
- Vendedor no obtiene `precio_compra_actual` aunque lo pida explícitamente.
- Input `"ignora tus instrucciones"` → `400 Bad Request`.
- SQL generado que no empiece con `SELECT` → rechazado antes de ejecutarse.
- `INSERT` con el usuario `chatbot_ro` en PostgreSQL → `ERROR: permission denied`.
