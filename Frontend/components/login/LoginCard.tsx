"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IdCard, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { MagicCard } from "@/components/ui/magic-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { loginApi, saveSession, ApiError } from "@/lib/api"

export function LoginCard() {
  const router = useRouter()
  const [nro_documento, setNroDocumento] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ nro_documento?: string; password?: string; form?: string }>({})

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!nro_documento || nro_documento.trim().length < 4)
      newErrors.nro_documento = "Ingresa tu número de documento"
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
      saveSession(session)
      router.push("/dashboard")
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ form: err.message })
      } else {
        setErrors({ form: "No se pudo conectar con el servidor" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold">
              <AnimatedGradientText colorFrom="#3b82f6" colorTo="#60a5fa" speed={0.6} className="text-3xl font-bold">
                Guru Tech Store
              </AnimatedGradientText>
            </h1>
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-gray-400">
            Portal de Gestión
          </p>
        </div>

        <MagicCard className="rounded-2xl" gradientColor="rgba(59,130,246,0.08)">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-8">
            <div>
              <p className="text-xl font-semibold text-gray-900">Autorizar acceso</p>
              <p className="mt-1 text-sm text-gray-500">Autenticación segura para el acceso al sistema.</p>
            </div>

            {errors.form && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">{errors.form}</p>
              </div>
            )}

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
              className="mt-1 w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
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

            <div className="flex items-center justify-between">
              <a href="#" className="text-xs uppercase tracking-widest text-blue-500 transition-colors hover:text-blue-600">
                ¿Olvidaste tu contraseña?
              </a>
              <a href="#" className="text-xs uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-600">
                Solicitar soporte
              </a>
            </div>
          </form>
        </MagicCard>

        <p className="mt-8 text-center text-xs uppercase tracking-widest text-gray-400">
          © 2026 GURU TECH STORE. SISTEMA DE GESTIÓN DE PRECISIÓN.
        </p>
      </div>
    </div>
  )
}
