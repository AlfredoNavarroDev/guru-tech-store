'use client'

import { useState } from 'react'
import { Bot, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ChatbotPanel } from './ChatbotPanel'

export function ChatbotFAB() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chatbot-panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
            style={{ boxShadow: '0 8px 40px 0 rgba(2,6,23,0.22)' }}
          >
            <ChatbotPanel onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        onClick={() => setIsOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-bg text-lime shadow-lg"
        aria-label={isOpen ? 'Cerrar asistente' : 'Abrir asistente'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="icon-x"
              initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
              transition={{ duration: 0.18 }}
            >
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="icon-chat"
              initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
              transition={{ duration: 0.18 }}
            >
              <Bot className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}
