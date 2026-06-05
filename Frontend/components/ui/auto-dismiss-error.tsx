"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { AlertCircle } from "lucide-react"

interface AutoDismissErrorProps {
  message: string | null | undefined
  onDismiss: () => void
  variant?: "banner" | "text"
}

export function AutoDismissError({ message, onDismiss, variant = "text" }: AutoDismissErrorProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 1500)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          {variant === "banner" ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <p className="text-xs text-red-600">{message}</p>
            </div>
          ) : (
            <p className="text-xs text-red-600">{message}</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
