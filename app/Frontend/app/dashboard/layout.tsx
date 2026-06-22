"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { getSession, clearSession, setAuthCookie, type AuthSession } from "@/lib/api/auth"

const SEGMENT_TITLES: Record<string, string> = {
  dashboard: "Resumen",
  catalogo: "Catálogo",
  carrito: "Carrito",
  ventas: "Ventas",
  clientes: "Clientes",
  empleados: "Empleados",
  compras: "Compras",
  proveedores: "Proveedores",
  stock: "Stock",
  items: "Ítems",
  nueva: "Nueva compra",
  historial: "Historial técnico",
  cambios: "Cambios de producto",
}

function getPageTitle(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean).pop() ?? "dashboard"
  return SEGMENT_TITLES[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Razonamiento: diferir lectura de sesión evita setState síncrono dentro del efecto inicial.
    const sessionTimeout = window.setTimeout(() => {
      const raw = localStorage.getItem("guru_auth")
      if (!raw) { router.push("/login"); return }
      try {
        const currentSession = getSession()
        if (!currentSession) { router.push("/login"); return }
        setSession(currentSession)
        setAuthCookie(currentSession.access_token)
      } catch {
        router.push("/login")
      }
    }, 0)
    return () => window.clearTimeout(sessionTimeout)
  }, [router])

  const handleLogout = async () => {
    // Call logout API if available
    try {
      const refreshToken = localStorage.getItem("guru_refresh_token")
      if (refreshToken) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => {})
      }
    } finally {
      clearSession()
      router.push("/login")
    }
  }

  const pageTitle = getPageTitle(pathname)

  return (
    <div className="flex h-screen bg-bg-main">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <Sidebar
        session={session}
        onLogout={handleLogout}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <motion.button
              onClick={() => setSidebarOpen((v) => !v)}
              whileHover={{ backgroundColor: "rgb(243 244 246)" }}
              whileTap={{ scale: 0.88 }}
              transition={{ duration: 0.15 }}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 lg:hidden overflow-hidden"
              aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {sidebarOpen ? (
                  <motion.span
                    key="icon-x"
                    initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute"
                  >
                    <X className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="icon-menu"
                    initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute"
                  >
                    <Menu className="h-5 w-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={pageTitle}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="text-2xl font-extrabold text-gray-900"
              >
                {pageTitle}
              </motion.h1>
            </AnimatePresence>
          </div>
          {session && (
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{session.nombre.split(" ")[0]}</p>
                <p className="text-xs text-gray-500">{session.sede}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold uppercase text-blue-600">
                {session.nombre.charAt(0)}
              </div>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex-1 overflow-auto"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}
