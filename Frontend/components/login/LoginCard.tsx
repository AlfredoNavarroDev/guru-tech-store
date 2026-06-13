"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IdCard, Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { loginApi, saveSession } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"

export function LoginCard() {
  const router = useRouter()
  const [nro_documento, setNroDocumento] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ nro_documento?: string; password?: string }>({})

  const validate = () => {
    const newErrors: typeof errors = {}
    const docLen = nro_documento.trim().length
    if (!nro_documento || ![8, 9, 12].includes(docLen))
      newErrors.nro_documento = "Debe tener 8 (DNI), 9 (pasaporte) o 12 (CE) caracteres"
    if (!password || password.length < 6)
      newErrors.password = "Mínimo 6 caracteres"
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const session = await loginApi({ nro_documento: nro_documento.trim(), password })
      saveSession(session, session.refresh_token)
      router.push('/dashboard')
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("No se pudo conectar con el servidor")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-extrabold text-text-heading">
              Guru Tech Store
            </h1>
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-text-muted">
            Portal de Gestión
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 sm:p-8">
            <div>
              <p className="text-xl font-semibold text-gray-900">Autorizar acceso</p>
              <p className="mt-1 text-sm text-gray-500">Autenticación segura para el acceso al sistema.</p>
            </div>


            <div className="flex flex-col gap-4">
              {/* Documento */}
              <div className="space-y-1.5">
                <Label htmlFor="nro_documento" className="text-xs font-medium text-gray-700">
                  Número de documento
                </Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="nro_documento"
                    type="text"
                    value={nro_documento}
                    onChange={(e) => setNroDocumento(e.target.value)}
                    placeholder="Tu número de documento"
                    aria-invalid={!!errors.nro_documento}
                    aria-describedby={errors.nro_documento ? "doc-error" : undefined}
                    className={cn("pl-9", errors.nro_documento && "border-red-400 focus-visible:ring-red-400")}
                  />
                </div>
                {errors.nro_documento && (
                  <p id="doc-error" role="alert" className="text-xs text-red-500">
                    {errors.nro_documento}
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-gray-700">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={cn("pl-9 pr-10", errors.password && "border-red-400 focus-visible:ring-red-400")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-xs text-red-500">
                    {errors.password}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-6 bg-lime hover:bg-[#d4f96a] text-[#020617] font-bold rounded-xl shadow-[0_0_16px_rgba(172,248,71,0.25)] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Autenticando...
                </span>
              ) : (
                "Iniciar sesión →"
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <p className="text-xs uppercase tracking-widest text-gray-400">
            Guru Tech Dev · © 2026
          </p>
        </div>
      </div>
    </div>
  )
}
