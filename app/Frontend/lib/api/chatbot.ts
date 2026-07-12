import { authRequest } from './client'

export const CHAT_HISTORY_KEY = (idEmpleado: number) =>
  `guru_chat_${idEmpleado}`

export async function getSuggestions(): Promise<string[]> {
  return authRequest<string[]>('chatbot/suggestions')
}

export async function getResumenDiario(): Promise<string> {
  const res = await authRequest<{ resumen: string }>('chatbot/resumen')
  return res.resumen
}

export const CHAT_DRAFT_KEY = (idEmpleado: number) => `guru_draft_${idEmpleado}`

export function loadDraft(idEmpleado: number): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(CHAT_DRAFT_KEY(idEmpleado)) ?? ''
}

export function saveDraft(idEmpleado: number, text: string): void {
  if (text) {
    localStorage.setItem(CHAT_DRAFT_KEY(idEmpleado), text)
  } else {
    localStorage.removeItem(CHAT_DRAFT_KEY(idEmpleado))
  }
}
