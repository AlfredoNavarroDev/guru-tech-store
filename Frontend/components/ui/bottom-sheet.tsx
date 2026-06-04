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
}

export function BottomSheet({
  open,
  onClose,
  children,
  disabled = false,
  className,
  wrapperClassName,
}: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  React.useEffect(() => {
    if (!open) {
      setIsScrolled(false)
      return
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => !disabled && onClose()}
          />

          <motion.div
            key="bottom-sheet-wrapper"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className={cn(
              "fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 pointer-events-none",
              wrapperClassName
            )}
          >
            <motion.div
              ref={sheetRef}
              drag={canDrag ? "y" : false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.15 }}
              onDragEnd={handleDragEnd}
              className={cn("pointer-events-auto w-full sm:max-w-lg", className)}
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
