'use client'

import { useChat, type Message } from 'ai/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Send, X, RotateCcw, MessageSquare, Mic } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { getSession } from '@/lib/api/auth'
import { CHAT_HISTORY_KEY, getSuggestions, getResumenDiario } from '@/lib/api/chatbot'
import { cn } from '@/lib/utils'
import { ChatMessage } from './ChatMessage'

const MAX_STORED_MESSAGES = 50

function loadHistory(idEmpleado: number): Message[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY(idEmpleado))
    return raw ? (JSON.parse(raw) as Message[]) : []
  } catch {
    return []
  }
}

function saveHistory(idEmpleado: number, messages: Message[]): void {
  const toSave = messages.slice(-MAX_STORED_MESSAGES)
  localStorage.setItem(CHAT_HISTORY_KEY(idEmpleado), JSON.stringify(toSave))
}

interface ChatbotPanelProps {
  onClose: () => void
}

export function ChatbotPanel({ onClose }: ChatbotPanelProps) {
  const session = getSession()
  const idEmpleado = session?.id_empleado ?? 0
  const token = session?.access_token ?? ''
  const pathname = usePathname()

  // useState lazy init guarantees a single stable reference across renders,
  // unlike useMemo which React 19 concurrent mode may invalidate, causing
  // @ai-sdk/react's useStableValue([latestValue, value]) to loop 50+ times.
  const [initialMessages] = useState<Message[]>(() => loadHistory(idEmpleado))
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(() => initialMessages.length === 0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const chatHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const onError = useCallback(() => {}, [])

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    append,
    setInput,
  } = useChat({
    api: `${process.env.NEXT_PUBLIC_API_URL}/chatbot/messages`,
    headers: chatHeaders,
    initialMessages,
    onError,
    body: { context_page: pathname },
  })

  useEffect(() => {
    if (messages.length > 0) {
      saveHistory(idEmpleado, messages)
      if (showSuggestions) setShowSuggestions(false)
    }
  }, [messages, idEmpleado, showSuggestions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (showSuggestions) {
      getSuggestions()
        .then(setSuggestions)
        .catch(() => {})
    }
  }, [showSuggestions])

  useEffect(() => {
    if (initialMessages.length > 0) return
    getResumenDiario()
      .then((resumen) => {
        setMessages([{ id: 'resumen-diario', role: 'assistant', content: resumen }])
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleNewChat() {
    setMessages([])
    localStorage.removeItem(CHAT_HISTORY_KEY(idEmpleado))
    setShowSuggestions(true)
    getResumenDiario()
      .then((resumen) => {
        setMessages([{ id: 'resumen-diario', role: 'assistant', content: resumen }])
      })
      .catch(() => {})
  }

  function handleSuggestionClick(suggestion: string) {
    append({ role: 'user', content: suggestion })
    setShowSuggestions(false)
  }

  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition

    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'es-PE'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string
      setInput(input + (input ? ' ' : '') + transcript)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
      }
    }

    recognition.onend = () => setIsRecording(false)
    recognition.onerror = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const lastAssistantMessageId =
    messages.length > 0 && messages[messages.length - 1].role === 'assistant'
      ? messages[messages.length - 1].id
      : null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-sidebar-bg px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-lime" />
          <span className="text-sm font-semibold text-white">Asistente Guru</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            title="Nuevo chat"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-lime"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-white p-4">
        {messages.length === 0 && showSuggestions && (
          <div className="flex flex-col gap-3">
            <p className="text-center text-xs text-text-muted">¿En qué puedo ayudarte?</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-left text-xs text-text-heading hover:border-lime hover:bg-bg-main"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isStreaming={isLoading && msg.id === lastAssistantMessageId}
          />
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-bg-main px-4 py-2.5">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = input.trim()
          if (!trimmed || isLoading) return
          append({ role: 'user', content: trimmed })
          setInput('')
          if (textareaRef.current) textareaRef.current.style.height = 'auto'
        }}
        className="shrink-0 border-t border-gray-200 bg-white p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-bg-main px-3 py-2 focus-within:border-sidebar-bg focus-within:ring-1 focus-within:ring-sidebar-bg">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              handleInputChange(e)
              const el = textareaRef.current
              if (el) {
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const trimmed = input.trim()
                if (!trimmed || isLoading) return
                append({ role: 'user', content: trimmed })
                setInput('')
                if (textareaRef.current) textareaRef.current.style.height = 'auto'
              }
            }}
            placeholder="Escribe tu consulta..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-text-heading placeholder-text-muted outline-none"
            style={{ overflowY: 'auto' }}
          />
          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? 'Detener grabación' : 'Dictar mensaje'}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-text-muted hover:text-sidebar-bg',
            )}
          >
            <Mic className="h-3.5 w-3.5" />
          </button>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-bg text-lime disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-text-muted">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </form>
    </div>
  )
}
