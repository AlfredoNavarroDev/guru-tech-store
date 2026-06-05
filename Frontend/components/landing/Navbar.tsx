"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { ShimmerButton } from "@/components/ui/shimmer-button"

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY < 60) {
        setVisible(true)
      } else {
        setVisible(currentY < lastScrollY.current)
      }
      lastScrollY.current = currentY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={[
        "fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md",
        "transition-transform duration-300 ease-in-out",
        visible ? "translate-y-0" : "-translate-y-full",
      ].join(" ")}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold text-white tracking-tight">
          Guru Tech Store
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <Link href="#plataforma" className="transition-colors hover:text-white">Plataforma</Link>
          <Link href="#soluciones" className="transition-colors hover:text-white">Soluciones</Link>
          <Link href="#recursos" className="transition-colors hover:text-white">Recursos</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full border border-white/20 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-white/40 hover:text-white md:block"
          >
            Iniciar sesión
          </Link>
          <ShimmerButton
            borderRadius="8px"
            shimmerDuration="2.5s"
            className="hidden px-4 py-2 text-sm font-medium md:inline-flex"
          >
            Contacto
          </ShimmerButton>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden md:hidden"
          >
            <div className="border-t border-white/10 bg-black/95 px-6 py-4">
              <div className="flex flex-col gap-4">
                <Link
                  href="#plataforma"
                  onClick={() => setOpen(false)}
                  className="text-sm text-zinc-300 transition-colors hover:text-white"
                >
                  Plataforma
                </Link>
                <Link
                  href="#soluciones"
                  onClick={() => setOpen(false)}
                  className="text-sm text-zinc-300 transition-colors hover:text-white"
                >
                  Soluciones
                </Link>
                <Link
                  href="#recursos"
                  onClick={() => setOpen(false)}
                  className="text-sm text-zinc-300 transition-colors hover:text-white"
                >
                  Recursos
                </Link>
                <div className="mt-2 flex flex-col gap-3 border-t border-white/10 pt-4">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-white/20 px-4 py-2 text-center text-sm text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
                  >
                    Iniciar sesión
                  </Link>
                  <ShimmerButton
                    borderRadius="8px"
                    shimmerDuration="2.5s"
                    className="w-full justify-center px-4 py-2 text-sm font-medium"
                  >
                    Contacto
                  </ShimmerButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
