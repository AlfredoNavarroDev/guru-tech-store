"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Zap, Package, ShoppingBag, Building2,
  CheckCircle2, ChevronRight, ArrowRight,
  Shield, Smartphone, Menu, X,
} from "lucide-react"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { BlurFade } from "@/components/ui/blur-fade"
import { cn } from "@/lib/utils"

type RoleId = "propietario" | "administrador" | "vendedor" | "tecnico" | "abastecedor"

const NAV_ROLES: { id: RoleId; label: string }[] = [
  { id: "propietario",  label: "Propietario" },
  { id: "administrador", label: "Administrador" },
  { id: "vendedor",     label: "Vendedor" },
  { id: "tecnico",      label: "Técnico" },
  { id: "abastecedor",  label: "Abastecedor" },
]

// ─── Mock visuals ──────────────────────────────────────────────────────────

function ServerMock() {
  return (
    <div className="relative h-80 overflow-hidden rounded-2xl bg-bg-dark">
      <AnimatedGridPattern
        className="absolute inset-0 text-white/5 fill-white/5 stroke-white/5"
        numSquares={30}
        maxOpacity={0.04}
        duration={3}
      />
      <div className="absolute inset-0 flex flex-col justify-center gap-1.5 p-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex h-6 items-center gap-2 rounded-lg bg-white/5 px-3">
            <div
              className={cn(
                "h-1.5 w-1.5 animate-pulse rounded-full",
                i % 4 === 0 ? "bg-blue-500" :
                i % 4 === 1 ? "bg-blue-300" :
                i % 4 === 2 ? "bg-white/30" : "bg-white/10"
              )}
            />
            <div className="h-1 flex-1 rounded bg-white/10" />
            <div className="flex gap-1">
              <div className="h-1 w-4 rounded bg-white/5" />
              <div className="h-1 w-4 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-40 -translate-x-1/2 rounded-full bg-blue-100 blur-3xl" />
      <div className="pointer-events-none absolute right-6 top-6 h-16 w-16 rounded-full bg-blue-50 blur-2xl" />
    </div>
  )
}

function DashboardMock() {
  return (
    <div className="relative h-80 overflow-hidden rounded-2xl bg-bg-dark">
      <AnimatedGridPattern
        className="absolute inset-0 text-white/5 fill-white/5 stroke-white/5"
        numSquares={25}
        maxOpacity={0.04}
        duration={3}
      />
      <div className="absolute inset-8 overflow-hidden rounded-xl bg-[#111827] shadow-2xl">
        <div className="flex h-8 items-center gap-1.5 border-b border-white/5 px-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <div className="ml-2 h-3 flex-1 rounded bg-white/5" />
        </div>
        <div className="p-3">
          <div className="mb-3 flex h-16 items-end gap-0.5">
            {[55, 75, 40, 90, 65, 80, 50, 70, 85, 60, 75, 45].map((h, i) => (
              <div
                key={i}
                className={cn("flex-1 rounded-t", i === 3 || i === 7 ? "bg-blue-500/70" : "bg-blue-300/25")}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {["bg-white/5", "bg-blue-300/25", "bg-blue-100"].map((c, i) => (
              <div key={i} className={cn("h-8 rounded-lg", c)} />
            ))}
          </div>
          {[70, 50, 85].map((w, i) => (
            <div key={i} className="mt-2 h-1.5 rounded bg-white/5" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-1/2 h-20 w-32 -translate-x-1/2 rounded-full bg-blue-50 blur-3xl" />
    </div>
  )
}

function TerminalMock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">UNIFIED TERMINAL</span>
        <div className="flex gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
        </div>
      </div>
      {[70, 55, 40].map((w, i) => (
        <div key={i} className="mb-2 flex gap-2">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-2 rounded bg-gray-200" style={{ width: `${w}%` }} />
            <div className="h-1.5 rounded bg-gray-100" style={{ width: `${w - 15}%` }} />
          </div>
        </div>
      ))}
      <div className="mt-2 flex gap-1.5">
        {[
          { bg: "bg-blue-50", dot: "bg-blue-300/50" },
          { bg: "bg-blue-100", dot: "bg-blue-500/70" },
          { bg: "bg-gray-100", dot: "bg-gray-300" },
        ].map(({ bg, dot }, i) => (
          <div key={i} className={cn("flex h-10 flex-1 items-center justify-center rounded-xl", bg)}>
            <div className={cn("h-4 w-4 rounded", dot)} />
          </div>
        ))}
      </div>
      <div className="absolute -bottom-2 -right-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">
          <Zap className="h-3 w-3 text-blue-500" />
        </div>
        <div>
          <div className="text-[8px] font-bold uppercase tracking-widest text-gray-400">REAL-TIME SYNC</div>
          <div className="text-xs font-bold text-text-heading">0.02s Rápido</div>
        </div>
      </div>
    </div>
  )
}

function RepairMock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
          Órdenes de servicio
        </span>
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
      </div>
      {[
        { id: "OS-001", device: "iPhone 13 Pro", status: "En reparación", bg: "bg-blue-100", text: "text-blue-600" },
        { id: "OS-002", device: "Samsung S22",   status: "Diagnóstico",   bg: "bg-yellow-100", text: "text-yellow-600" },
        { id: "OS-003", device: "Xiaomi 12",     status: "Listo",         bg: "bg-green-100",  text: "text-green-600" },
      ].map(({ id, device, status, bg, text }) => (
        <div key={id} className="mb-2 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Smartphone className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700">{device}</div>
            <div className="text-[10px] text-gray-400">{id}</div>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", bg, text)}>
            {status}
          </span>
        </div>
      ))}
      <div className="mt-3 flex gap-2">
        <div className="flex flex-1 items-center justify-center rounded-xl bg-blue-50 py-2">
          <span className="text-[10px] font-bold text-blue-600">+ Nueva orden</span>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-xl bg-gray-100 py-2">
          <span className="text-[10px] font-bold text-gray-500">Ver historial</span>
        </div>
      </div>
    </div>
  )
}

function InventoryMock() {
  return (
    <div className="relative h-80 overflow-hidden rounded-2xl bg-bg-dark">
      <AnimatedGridPattern
        className="absolute inset-0 text-white/5 fill-white/5 stroke-white/5"
        numSquares={25}
        maxOpacity={0.04}
        duration={3}
      />
      <div className="absolute inset-0 flex flex-col justify-center gap-2 p-6">
        <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
          Control de stock
        </div>
        {[
          { label: "Laptops ASUS",   stock: 85, color: "bg-blue-500" },
          { label: "Smartphones",    stock: 42, color: "bg-blue-400/70" },
          { label: "Accesorios USB", stock: 93, color: "bg-blue-300/50" },
          { label: "Cables HDMI",    stock: 20, color: "bg-red-400/70" },
          { label: "Cargadores",     stock: 67, color: "bg-blue-500/60" },
        ].map(({ label, stock, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
            <Package className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <span className="flex-1 text-xs text-white/60">{label}</span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-white/10">
              <div className={cn("h-full rounded-full", color)} style={{ width: `${stock}%` }} />
            </div>
            <span className="w-8 text-right text-[10px] font-bold text-white/40">{stock}%</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-20 w-40 -translate-x-1/2 rounded-full bg-blue-100 blur-3xl" />
    </div>
  )
}

// ─── Landing Page ──────────────────────────────────────────────────────────

export default function LandingPage() {
  const [active, setActive] = useState<RoleId>("propietario")
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && NAV_ROLES.some(r => r.id === e.target.id)) {
            setActive(e.target.id as RoleId)
          }
        }
      },
      { threshold: 0.3, rootMargin: "-15% 0px -60% 0px" }
    )
    NAV_ROLES.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-bg-main">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-extrabold tracking-tight text-text-heading">
            Guru Tech Store
          </span>
          {/* Desktop links */}
          <div className="hidden items-center gap-6 md:flex">
            {NAV_ROLES.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className={cn(
                  "text-sm transition-colors",
                  active === id
                    ? "border-b-2 border-blue-400 pb-px font-semibold text-text-heading"
                    : "text-text-muted hover:text-text-heading"
                )}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 md:block"
            >
              Iniciar sesión
            </Link>
            <button
              type="button"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-gray-100 hover:text-text-heading md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {mobileOpen && (
          <div id="mobile-menu" className="border-t border-gray-100 bg-white px-6 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {NAV_ROLES.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "text-sm transition-colors",
                    active === id
                      ? "font-semibold text-text-heading"
                      : "text-text-muted hover:text-text-heading"
                  )}
                >
                  {label}
                </a>
              ))}
              <div className="border-t border-gray-100 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-2xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-bg-dark py-20 sm:py-28">
        <AnimatedGridPattern
          className="absolute inset-0 text-white/5 fill-white/5 stroke-white/5"
          numSquares={40}
          maxOpacity={0.04}
          duration={3}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <BlurFade delay={0} duration={0.5}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-300">
              <Zap className="h-3 w-3" />
              Sistema ERP · Guru Tech Store
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Bienvenido al sistema
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/50">
              Guía de acceso según tu rol. Conoce tus capacidades antes de iniciar sesión.
            </p>
            <a
              href={`#${NAV_ROLES[0].id}`}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Ver roles
              <ChevronRight className="h-4 w-4" />
            </a>
          </BlurFade>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      </section>

      {/* ══ PROPIETARIO ══ */}
      <section id="propietario" aria-labelledby="propietario-heading" className="bg-bg-main">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <Building2 className="h-3 w-3" />
                  Propietario
                </div>
                <h2 id="propietario-heading" className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Visión completa del negocio
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Acceso completo al sistema. Supervisa todas las sedes, consulta reportes financieros y gestiona la estructura organizacional.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Ver reportes de ventas por sede",
                    "Gestionar empleados y roles",
                    "Acceso a todas las sedes",
                    "Consultar métricas del negocio",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
            <BlurFade delay={0.15} duration={0.5}>
              <DashboardMock />
            </BlurFade>
          </div>
        </div>
      </section>

      {/* ══ ADMINISTRADOR ══ */}
      <section id="administrador" aria-labelledby="administrador-heading" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <Shield className="h-3 w-3" />
                  Administrador
                </div>
                <h2 id="administrador-heading" className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Control de la sede
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Administra las operaciones de su sede. Gestiona personal, supervisa el inventario y controla las ventas.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Gestionar empleados de la sede",
                    "Supervisar ventas e inventario",
                    "Configurar precios y catálogo",
                    "Ver reportes de la sede",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
            <BlurFade delay={0.15} duration={0.5} className="order-last lg:order-first">
              <ServerMock />
            </BlurFade>
          </div>
        </div>
      </section>

      {/* ══ VENDEDOR ══ */}
      <section id="vendedor" aria-labelledby="vendedor-heading" className="bg-bg-main">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <ShoppingBag className="h-3 w-3" />
                  Vendedor
                </div>
                <h2 id="vendedor-heading" className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Punto de venta ágil
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Opera el punto de venta. Registra ventas, gestiona clientes y emite boletas de manera rápida y eficiente.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Registrar ventas en el POS",
                    "Buscar y crear clientes",
                    "Emitir boletas de venta",
                    "Consultar catálogo de productos",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
            <BlurFade delay={0.15} duration={0.5}>
              <TerminalMock />
            </BlurFade>
          </div>
        </div>
      </section>

      {/* ══ TÉCNICO ══ */}
      <section id="tecnico" aria-labelledby="tecnico-heading" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <Smartphone className="h-3 w-3" />
                  Técnico
                </div>
                <h2 id="tecnico-heading" className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Servicio técnico profesional
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Recibe y repara dispositivos de clientes. Gestiona órdenes de servicio técnico desde el ingreso hasta la entrega.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Registrar y buscar clientes",
                    "Ingresar dispositivos para reparación",
                    "Gestionar órdenes de servicio técnico",
                    "Registrar diagnóstico y reparación",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
            <BlurFade delay={0.15} duration={0.5} className="order-last lg:order-first">
              <RepairMock />
            </BlurFade>
          </div>
        </div>
      </section>

      {/* ══ ABASTECEDOR ══ */}
      <section id="abastecedor" aria-labelledby="abastecedor-heading" className="bg-bg-main">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <Package className="h-3 w-3" />
                  Abastecedor
                </div>
                <h2 id="abastecedor-heading" className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Gestión de inventario
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Gestiona el reabastecimiento del inventario. Coordina con proveedores y controla los niveles de stock.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Gestionar órdenes de reposición",
                    "Controlar niveles de stock",
                    "Coordinar con proveedores",
                    "Registrar entradas de inventario",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
            <BlurFade delay={0.15} duration={0.5}>
              <InventoryMock />
            </BlurFade>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-text-heading">
                Guru Tech Store
              </p>
              <p className="mt-1 text-xs text-text-muted">© 2026 Guru Tech Dev.</p>
            </div>
            <div className="flex flex-wrap gap-6">
              {["Política de Privacidad", "Términos de Servicio", "Seguridad", "Estado"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors hover:text-text-heading"
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
