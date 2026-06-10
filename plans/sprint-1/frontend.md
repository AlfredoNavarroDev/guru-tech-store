# Sprint 1 — Frontend

**Stack:** Next.js 14 · Tailwind CSS · Magic UI · Lucide React  
**Story Points:** incluidos en HU-01 a HU-03 (flujo auth)  
**Entregables:** Página de login funcional con integración al backend de Auth

---

## Páginas

| Ruta     | Archivo            | Descripción                      |
|----------|--------------------|----------------------------------|
| `/login` | `app/login/page.tsx` | Autenticación de empleados     |

---

## Login Page

### Objetivo
Página de autenticación para todos los roles del sistema. Diseño oscuro, premium, con animaciones que transmiten seguridad y modernidad.

### Layout — Desktop (≥ 1024px): Split-screen 50/50

```
┌─────────────────────┬─────────────────────┐
│   Panel Izquierdo   │    Panel Derecho     │
│                     │                      │
│  AnimatedGridPattern│  [AnimatedGradient]  │
│  Fondo animado      │   Guru Tech Store    │
│                     │   Portal de Gestión  │
│  Logo + nombre      │                      │
│  3 feature bullets  │   [MagicCard]        │
│  con checks verdes  │   + BorderBeam       │
│                     │                      │
│                     │   Email input        │
│                     │   Password input     │
│                     │   ShimmerButton      │
└─────────────────────┴─────────────────────┘
```

### Layout — Mobile (< 1024px)
- Panel izquierdo oculto
- Solo panel derecho full-width

---

## Componentes Magic UI

| Componente           | Uso                                              |
|----------------------|--------------------------------------------------|
| `MagicCard`          | Wrapper del formulario — spotlight sigue cursor  |
| `BorderBeam`         | Borde animado del MagicCard (azul → cyan, 3s)    |
| `AnimatedGradientText` | Logo "Guru Tech Store" en panel derecho        |
| `AnimatedGridPattern`| Fondo del panel izquierdo decorativo             |
| `DotPattern`         | Fondo global de la página (máscara radial)       |
| `ShimmerButton`      | Botón submit                                     |

### Configuración
- Spotlight del MagicCard: `rgba(59, 130, 246, 0.15)`
- BorderBeam: `#3b82f6` → `#06b6d4`
- Fondo global: `#050505`

---

## Formulario

### Campos
```
[✉]  Correo Electrónico
[🔒]  Contraseña  [👁 toggle]
```

### Estilos de inputs
```css
bg-white/5 border border-white/10
focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
backdrop-blur-sm
```

### Submit
- `ShimmerButton` full-width
- Texto: `"Iniciar sesión →"`
- Estado loading: spinner `Loader2` + texto `"Autenticando..."`
- Estado disabled durante loading

### Estado de error
- Border: `border-red-500/50`
- Mensaje rojo bajo el campo
- Animación shake via Tailwind custom `@keyframes`

---

## Validación Client-Side
- Email: `/.+@.+\..+/`
- Password: mínimo 6 caracteres
- Errores inline bajo cada campo
- No submit si hay errores

---

## Navegación post-login

```typescript
// Al submit exitoso → redirigir según rol del JWT
switch (roles[0]) {
  case 'vendedor':      redirect('/dashboard/vendedor');
  case 'admin':         redirect('/dashboard/admin');
  case 'abastecedor':   redirect('/dashboard/abastecedor');
  case 'tecnico':       redirect('/dashboard/tecnico');
}
```

---

## Panel Izquierdo — Contenido Decorativo

```
[Icono logo grande]
Guru Tech Store

"Sistema de gestión empresarial
para múltiples sedes"

✓  Inventario en tiempo real
✓  Control de ventas unificado
✓  Gestión multi-sede
```

---

## Accesibilidad
- Labels asociados a inputs (`sr-only` si floating)
- `aria-invalid` en campos con error
- `aria-describedby` para mensajes de error
- Focus trap dentro del card
- `role="alert"` para mensajes de error dinámicos

---

## Archivos a Crear

```
app/login/
  page.tsx
components/login/
  LoginCard.tsx       — MagicCard + BorderBeam + form wrapper
  LoginForm.tsx       — inputs + validación + submit + fetch a /auth/login
  DecorativePanel.tsx — panel izquierdo (logo + bullets)
lib/
  auth.ts             — helper: decode JWT, store/refresh tokens, logout real (HU-23)
  api.ts              — fetch wrapper con interceptor de refresh ante 401 (HU-23)
```

---

## Integración con Backend

### Login (HU-01 + HU-23)
```typescript
// LoginForm.tsx
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ documento, password }),
});

if (!res.ok) {
  setError('Credenciales inválidas');
  return;
}

const { access_token, refresh_token, roles, id_sede } = await res.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token); // HU-23
// redirigir según rol
```

### Auto-refresh ante 401 (HU-23)
```typescript
// lib/api.ts — fetch wrapper con interceptor
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const accessToken = localStorage.getItem('access_token');
  let res = await fetch(url, {
    ...options,
    headers: { ...options?.headers, Authorization: `Bearer ${accessToken}` },
  });

  // Si el access_token expiró, intentar renovar con refresh_token
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) { window.location.href = '/login'; return res; }

    const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!refreshRes.ok) {
      // Refresh fallido (token revocado o expirado) → forzar logout
      localStorage.clear();
      window.location.href = '/login';
      return res;
    }

    const { access_token: newToken } = await refreshRes.json();
    localStorage.setItem('access_token', newToken);

    // Reintentar la request original con el nuevo token
    res = await fetch(url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${newToken}` },
    });
  }

  return res;
}
```

### Logout real (HU-02 + HU-23)
```typescript
// lib/auth.ts
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (refreshToken) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {}); // ignorar error si ya está revocado
  }
  localStorage.clear();
  window.location.href = '/login';
}
```

> **Nota de seguridad:** En producción considerar `httpOnly cookies` en lugar de `localStorage` para el `refresh_token`. Para esta etapa de desarrollo, `localStorage` es aceptable.
