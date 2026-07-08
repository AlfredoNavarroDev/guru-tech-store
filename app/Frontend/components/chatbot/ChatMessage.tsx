// app/Frontend/components/chatbot/ChatMessage.tsx
import { useState } from 'react'
import type { Message } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const content = typeof message.content === 'string' ? message.content : ''

  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className={cn('group flex w-full flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-sidebar-bg text-white rounded-tr-sm'
            : 'bg-bg-main text-text-heading rounded-tl-sm',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p: ({ children }) => (
                <p className="mb-1.5 last:mb-0 whitespace-pre-wrap">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-text-heading">{children}</strong>
              ),
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-sidebar-bg text-lime">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-left font-bold whitespace-nowrap text-black">{children}</th>
              ),
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => (
                <tr className="border-t border-gray-200 even:bg-white odd:bg-bg-main">{children}</tr>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-text-heading">{children}</td>
              ),
              ul: ({ children }) => (
                <ul className="mb-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt ?? ''}
                  className="my-2 max-w-full rounded-xl object-cover"
                />
              ),
              code: ({ children }) => (
                <code className="rounded bg-white/60 px-1 py-0.5 font-mono text-xs text-text-heading">
                  {children}
                </code>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
        {isStreaming && (
          <span className="ml-1 inline-block h-3 w-1.5 animate-pulse rounded-sm bg-current opacity-70" />
        )}
      </div>
        {!isUser && (
          <button
            onClick={handleCopy}
            title="Copiar respuesta"
            className="mt-1 flex items-center gap-1 px-1 py-0.5 text-[10px] text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-heading"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span className="text-green-500">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copiar</span>
              </>
            )}
          </button>
        )}
    </div>
  )
}
