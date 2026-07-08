"use client"

import * as React from "react"
import { motion, AnimatePresence, type PanInfo } from "motion/react"
import { cn } from "@/lib/utils"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
  wrapperClassName?: string
  centered?: boolean
}

export function BottomSheet({
  open,
  onClose,
  children,
  disabled = false,
  className,
  wrapperClassName,
  centered = false,
}: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    // Razonamiento: diferir lectura inicial evita setState síncrono dentro del efecto.
    const mobileTimeout = window.setTimeout(() => setIsMobile(mq.matches), 0)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => {
      window.clearTimeout(mobileTimeout)
      mq.removeEventListener("change", handler)
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      // Razonamiento: diferir reset evita setState síncrono al cerrar sheet.
      const scrollResetTimeout = window.setTimeout(() => setIsScrolled(false), 0)
      return () => window.clearTimeout(scrollResetTimeout)
    }
    function handleScroll(e: Event) {
      const el = e.target as HTMLElement
      if (typeof el.scrollTop === "number") {
        setIsScrolled(el.scrollTop > 0)
      }
    }
    document.addEventListener("scroll", handleScroll, true)
    return () => document.removeEventListener("scroll", handleScroll, true)
  }, [open])

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const sheetHeight = sheetRef.current?.offsetHeight ?? 400
    if (info.offset.y > sheetHeight * 0.3) {
      onClose()
    }
  }

  const canDrag = isMobile && !isScrolled && !disabled

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bottom-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", wrapperClassName)}
            onClick={() => !disabled && onClose()}
          />

          <motion.div
            key="bottom-sheet-wrapper"
            initial={centered ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 32 }}
            animate={centered ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
            exit={centered ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 32 }}
            transition={centered ? { duration: 0.2 } : { type: "spring", damping: 32, stiffness: 380 }}
            className={cn(
              centered
                ? "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                : "fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 pointer-events-none",
              wrapperClassName
            )}
          >
            <motion.div
              ref={sheetRef}
              drag={!centered && canDrag ? "y" : false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={handleDragEnd}
              className={cn(
                "pointer-events-auto",
                centered ? "w-full max-w-md rounded-2xl" : "w-full sm:max-w-lg",
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
