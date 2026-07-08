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
