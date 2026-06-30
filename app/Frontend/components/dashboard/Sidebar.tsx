"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Receipt, Grid3X3, UserRound,
  LogOut, Plus, Zap, PanelLeftClose, PanelLeftOpen,
  Boxes, ClipboardList, ShieldCheck, Wrench, Truck,
  ArrowLeftRight,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { AuthSession } from "@/lib/api/auth"

const vendedorNavLinks = [
  { href: "/dashboard",           label: "Resumen",    icon: LayoutDashboard },
  { href: "/dashboard/ventas",    label: "Ventas",     icon: Receipt },
  { href: "/dashboard/catalogo",  label: "Catálogo",   icon: Grid3X3 },
  { href: "/dashboard/clientes",  label: "Clientes",   icon: UserRound },
  { href: "/dashboard/cambios",   label: "Cambios",    icon: ArrowLeftRight },
  { href: "/dashboard/garantias", label: "Garantías",  icon: ShieldCheck },
]

const propietarioNavLinks = [
  { href: "/dashboard",            label: "Resumen",    icon: LayoutDashboard },
  { href: "/dashboard/ventas",     label: "Ventas",     icon: Receipt },
  { href: "/dashboard/clientes",   label: "Clientes",   icon: UserRound },
  { href: "/dashboard/empleados",  label: "Empleados",  icon: UserRound },
  { href: "/dashboard/stock",      label: "Inventario", icon: Boxes },
  { href: "/dashboard/catalogo",   label: "Catálogo",   icon: Grid3X3 },
  { href: "/dashboard/cambios",    label: "Cambios",    icon: ArrowLeftRight },
  { href: "/dashboard/garantias",  label: "Garantías",  icon: ShieldCheck },
]

const roleNavLinks = {
  admin: [
    { href: "/dashboard", label: "Admin", icon: ShieldCheck },
    { href: "/dashboard/empleados", label: "Empleados", icon: UserRound },
  ],
  administrador: [
    { href: "/dashboard", label: "Admin", icon: ShieldCheck },
    { href: "/dashboard/empleados", label: "Empleados", icon: UserRound },
  ],
  abastecedor: [
    { href: "/dashboard",             label: "Overview",    icon: LayoutDashboard },
    { href: "/dashboard/items",       label: "Catálogo",    icon: Grid3X3 },
    { href: "/dashboard/stock",       label: "Stock",       icon: Boxes },
    { href: "/dashboard/compras",     label: "Compras",     icon: ClipboardList },
    { href: "/dashboard/proveedores", label: "Proveedores", icon: Truck },
  ],
  tecnico: [
    { href: "/dashboard",              label: "Resumen",      icon: LayoutDashboard },
    { href: "/dashboard/reparaciones", label: "Reparaciones", icon: Wrench },
    { href: "/dashboard/clientes",     label: "Clientes",     icon: UserRound },
    { href: "/dashboard/garantias",    label: "Garantías",    icon: ShieldCheck },
  ],
  vendedor:    vendedorNavLinks,
  propietario: propietarioNavLinks,
  gerente:     vendedorNavLinks,
}

function matchesRoute(pathname: string, href: string) {
  if (pathname === href) return true
  if (href === "/dashboard") return false
  return pathname.startsWith(`${href}/`)
}

interface SidebarProps {
  session: AuthSession | null
  onLogout: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ session, onLogout, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const sessionLabel = session ? `${session.nombre} · ${session.sede}` : "Sesión no cargada"
  const navLinks = session ? (roleNavLinks[session.rol as keyof typeof roleNavLinks] ?? vendedorNavLinks) : []
  const showSalesCta = session ? ["vendedor", "propietario", "gerente"].includes(session.rol) : false
  const showComprasCta = session ? session.rol === "abastecedor" : false
  const showReparacionCta = session ? session.rol === "tecnico" : false
  const activeNavIndex = navLinks.reduce((bestIndex, link, index) => {
    if (!matchesRoute(pathname, link.href)) return bestIndex
    if (bestIndex === -1) return index
    return link.href.length > navLinks[bestIndex].href.length ? index : bestIndex
  }, -1)

  useEffect(() => {
    // Razonamiento: diferir preferencia evita setState síncrono dentro del efecto inicial.
    const collapsedTimeout = window.setTimeout(() => {
      const saved = localStorage.getItem("sidebar_collapsed")
      if (saved !== null) {
        setCollapsed(saved === "true")
      }
      // No saved preference → stays collapsed (true default)
    }, 0)
    return () => window.clearTimeout(collapsedTimeout)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    // Razonamiento: diferir lectura inicial evita setState síncrono; cambios posteriores sí llegan por callback externo.
    const desktopTimeout = window.setTimeout(() => setIsDesktop(mq.matches), 0)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener("change", handler)
    return () => {
      window.clearTimeout(desktopTimeout)
      mq.removeEventListener("change", handler)
    }
  }, [])

  useEffect(() => {
    onMobileClose?.()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const isCollapsed = collapsed && !mobileOpen

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("sidebar_collapsed", String(next))
  }

  const sidebarVariants = {
    open: { x: 0, transition: { type: "tween" as const, duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
    closed: { x: "-100%", transition: { type: "tween" as const, duration: 0.22, ease: [0.4, 0, 1, 1] as [number, number, number, number] } },
  }

  return (
    <motion.aside
      initial={false}
      variants={sidebarVariants}
      animate={isDesktop ? "open" : mobileOpen ? "open" : "closed"}
      aria-label={sessionLabel}
      className={cn(
        "fixed left-0 top-0 z-50 h-screen flex-col border-r border-white/5 bg-[#020617] shadow-2xl",
        "transition-[width] duration-300 ease-in-out",
        "lg:relative lg:flex lg:shadow-none",
        isCollapsed ? "w-[304px] lg:w-[72px]" : "w-[304px] lg:w-64",
        "flex overflow-hidden"
      )}
    >
      {/* ── Header ── */}
      <div className="flex h-20 shrink-0 items-center border-b border-white/10 overflow-hidden">
        {/* Desktop: collapse-aware */}
        <AnimatePresence initial={false} mode="wait">
          {isCollapsed ? (
            <motion.div
              key="header-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="hidden lg:flex w-full items-center justify-center"
            >
              <motion.button
                onClick={toggleCollapse}
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.92 }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-on-dark hover:text-white"
                aria-label="Expandir sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="header-expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="hidden lg:flex w-full items-center gap-3 px-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
                <Image
                  src="https://pub-70517b8feb72462790b99d3d0d9c7d63.r2.dev/gts_logo.png"
                  alt="Guru Tech Store"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              </div>
              <span className="flex-1 truncate text-sm font-semibold text-white">Guru Tech Store</span>
              <motion.button
                onClick={toggleCollapse}
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.92 }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-on-dark hover:text-white"
                aria-label="Colapsar sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile: logo in circle + brand in single row */}
        <div className="lg:hidden flex w-full items-center gap-3 px-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
            <Image
              src="https://pub-70517b8feb72462790b99d3d0d9c7d63.r2.dev/gts_logo.png"
              alt="Guru Tech Store"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
          </div>
          <span className="flex-1 truncate text-sm font-semibold text-white">Guru Tech Store</span>
        </div>
      </div>

      {showSalesCta && (
        <div className={cn("px-3 pt-4 overflow-hidden", isCollapsed && "lg:flex lg:justify-center lg:px-0")}>
          <AnimatePresence initial={false}>
            {isCollapsed ? (
              <motion.div
                key="cta-icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="hidden lg:flex lg:justify-center"
              >
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link href="/dashboard/catalogo" className="inline-flex">
                        <Button size="icon" className="h-10 w-10 bg-lime hover:bg-[#d4f96a] text-[#020617] rounded-xl shadow-[0_0_12px_rgba(172,248,71,0.25)]">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </Link>
                    }
                  />
                  <TooltipContent side="right">Nueva venta</TooltipContent>
                </Tooltip>
              </motion.div>
            ) : (
              <motion.div
                key="cta-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Link href="/dashboard/catalogo">
                  <Button className="w-full gap-2.5 bg-lime hover:bg-[#d4f96a] text-[#020617] font-bold text-base py-4 h-auto rounded-xl transition-all duration-200">
                    <Zap className="h-4 w-4" />
                    Nueva venta
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {showComprasCta && (
        <div className={cn("px-3 pt-4 overflow-hidden", isCollapsed && "lg:flex lg:justify-center lg:px-0")}>
          <AnimatePresence initial={false}>
            {isCollapsed ? (
              <motion.div
                key="compras-cta-icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="hidden lg:flex lg:justify-center"
              >
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link href="/dashboard/compras/nueva" className="inline-flex">
                        <Button size="icon" className="h-10 w-10 bg-lime hover:bg-[#d4f96a] text-[#020617] rounded-xl shadow-[0_0_12px_rgba(172,248,71,0.25)]">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </Link>
                    }
                  />
                  <TooltipContent side="right">Nueva compra</TooltipContent>
                </Tooltip>
              </motion.div>
            ) : (
              <motion.div
                key="compras-cta-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Link href="/dashboard/compras/nueva">
                  <Button className="w-full gap-2.5 bg-lime hover:bg-[#d4f96a] text-[#020617] font-bold text-base py-4 h-auto rounded-xl transition-all duration-200">
                    <Zap className="h-4 w-4" />
                    Nueva compra
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {showReparacionCta && (
        <div className={cn("px-3 pt-4 overflow-hidden", isCollapsed && "lg:flex lg:justify-center lg:px-0")}>
          <AnimatePresence initial={false}>
            {isCollapsed ? (
              <motion.div
                key="reparacion-cta-icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="hidden lg:flex lg:justify-center"
              >
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link href="/dashboard/reparaciones/nueva" className="inline-flex">
                        <Button size="icon" className="h-10 w-10 bg-lime hover:bg-[#d4f96a] text-[#020617] rounded-xl shadow-[0_0_12px_rgba(172,248,71,0.25)]">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </Link>
                    }
                  />
                  <TooltipContent side="right">Registrar equipo</TooltipContent>
                </Tooltip>
              </motion.div>
            ) : (
              <motion.div
                key="reparacion-cta-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Link href="/dashboard/reparaciones/nueva">
                  <Button className="w-full gap-2.5 bg-lime hover:bg-[#d4f96a] text-[#020617] font-bold text-base py-4 h-auto rounded-xl transition-all duration-200">
                    <Wrench className="h-4 w-4" />
                    Registrar equipo
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="mx-4 my-4 border-t border-white/10" />

      {/* ── Nav links ── */}
      <nav className="flex flex-1 flex-col gap-1 p-3 pt-2">
        {navLinks.map(({ href, label, icon: Icon }, index) => {
          const active = index === activeNavIndex

          return (
            <Tooltip key={`${href}-${label}`} disabled={!isCollapsed}>
              <TooltipTrigger render={<div className="w-full" />}>
                <Link
                  href={href}
                  onClick={onMobileClose}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                    active
                      ? "text-[#020617] font-semibold shadow-[0_0_16px_rgba(6,182,212,0.45),0_0_6px_rgba(6,182,212,0.65)]"
                      : "text-text-on-dark font-bold hover:text-white overflow-hidden"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="pointer-events-none absolute inset-0 rounded-xl bg-[#06B6D4]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  {!active && (
                    <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/0 transition-colors duration-150 group-hover:bg-white/5" />
                  )}
                  <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" />
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        key={`label-${href}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.15 }}
                        className="relative z-10 truncate whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="shrink-0 border-t border-white/10 p-3">

        <Tooltip disabled={!isCollapsed}>
          <TooltipTrigger
            render={
              <motion.button
                onClick={onLogout}
                whileHover={{ backgroundColor: "rgba(127,29,29,0.2)" }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-on-dark transition-colors hover:text-red-400",
                  isCollapsed && "lg:justify-center"
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.span
                      key="logout-label"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      Cerrar sesión
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            }
          />
          <TooltipContent side="right">Cerrar sesión</TooltipContent>
        </Tooltip>
      </div>
    </motion.aside>
  )
}
