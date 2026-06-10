"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  Package,
  Search,
  Tag,
  Filter,
  AlertCircle,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  UserPlus,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Receipt,
  PlusCircle,
} from "lucide-react"
import { RippleButton } from "@/components/ui/ripple-button"
import { BlurFade } from "@/components/ui/blur-fade"
import { MagicCard } from "@/components/ui/magic-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getCatalogo, type CatalogoItem } from "@/lib/api/catalogo"
import { getClientes, createCliente, type ClienteVista } from "@/lib/api/clientes"
import { createVenta, createPago, emitirBoleta, type CreatePagoInput } from "@/lib/api/ventas"
import { cn, formatNum } from "@/lib/utils"
import { toast } from "sonner"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"

// ─── types ────────────────────────────────────────────────────────────────────

interface CartItem {
  id_item: number
  producto: string
  sku: string
  precio_unitario_momento: number
  precio_normal_momento: number | null
  costo_unitario_momento: number
  cantidad: number
  importe: number
  stock_disponible: number
}

type MetodoPago = CreatePagoInput["metodo_pago"]

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "otro", label: "Otro" },
]

const TIPOS_DOC = ["DNI", "CE", "pasaporte"] as const

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => formatNum(n)

// ─── StockBadge ───────────────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock > 10)
    return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">En stock ({stock})</Badge>
  if (stock >= 1)
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">Bajo stock ({stock})</Badge>
  return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Sin stock</Badge>
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  item: CatalogoItem
  delay: number
  onAdd: (item: CatalogoItem) => void
  inCart: boolean
  cartQty: number
}

function discountLabel(item: CatalogoItem): string {
  if (item.promo_tipo === "porcentaje" && item.promo_valor !== null)
    return `-${item.promo_valor}%`
  if (item.promo_tipo === "monto_fijo" && item.promo_valor !== null)
    return `-S/ ${fmt(item.promo_valor)}`
  if (item.precio_con_descuento !== null) {
    const diff = Number(item.precio_venta_actual) - Number(item.precio_con_descuento)
    return `-S/ ${fmt(diff)}`
  }
  return ""
}

function ProductCard({ item, delay, onAdd, inCart, cartQty }: ProductCardProps) {
  const hasPromo = item.precio_con_descuento != null &&
    item.precio_con_descuento !== 0 &&
    Number(item.precio_con_descuento) < Number(item.precio_venta_actual)
  return (
    <BlurFade delay={delay} duration={0.4} className="h-full">
      <div className="relative overflow-hidden rounded-2xl h-full">
        <MagicCard
          className="rounded-2xl h-full hover:shadow-md hover:border-blue-200 transition-all duration-200"
          gradientFrom="#3b82f6"
          gradientTo="#8b5cf6"
          gradientSize={180}
          gradientOpacity={0.06}
          cardBg="#ffffff"
        >
          <div className="relative z-40 flex h-full flex-col p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-gray-900">{item.producto}</p>
              </div>
              <div className="mt-0.5 shrink-0 flex flex-col items-end gap-1">
                <StockBadge stock={item.stock_disponible} />
                {hasPromo && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {discountLabel(item)}
                  </span>
                )}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600">
                {item.marca}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600">
                <Tag className="h-2.5 w-2.5" />
                {item.categoria}
              </span>
              {item.modelo && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-500">
                  {item.modelo}
                </span>
              )}
            </div>
            <div className="mt-auto">
              {/* fixed-height price row — isolated, nothing else moves it */}
              <div className="flex h-9 items-center gap-2 mb-3">
                <span className="text-2xl font-bold text-gray-900">
                  S/ {fmt(Number(hasPromo ? item.precio_con_descuento : item.precio_venta_actual))}
                </span>
                {hasPromo && (
                  <span className="text-sm text-gray-400 line-through tabular-nums">
                    S/ {fmt(Number(item.precio_venta_actual))}
                  </span>
                )}
              </div>
              <RippleButton
                type="button"
                onClick={() => onAdd(item)}
                disabled={cartQty >= item.stock_disponible}
                rippleColor={inCart ? "rgba(2,6,23,0.15)" : "rgba(172,248,71,0.45)"}
                duration="550ms"
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40",
                  inCart
                    ? "bg-[#020617]/10 text-[#020617] hover:bg-[#020617]/20"
                    : "bg-[#020617] text-lime hover:bg-[#0d1b38]"
                )}
              >
                <ShoppingCart className="h-4 w-4" />
                {inCart ? (cartQty >= item.stock_disponible ? "Stock agotado" : "Agregar más") : "Agregar"}
              </RippleButton>
            </div>
          </div>
        </MagicCard>
      </div>
    </BlurFade>
  )
}

// ─── CartItemsList ────────────────────────────────────────────────────────────

interface CartItemsListProps {
  items: CartItem[]
  onUpdateQty: (id: number, delta: number) => void
  onRemove: (id: number) => void
  deselected?: Set<number>
  onToggleSelect?: (id: number) => void
}

function CartItemsList({ items, onUpdateQty, onRemove, deselected, onToggleSelect }: CartItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 px-5">
        <ShoppingCart className="h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-400 text-center">Agrega productos desde el catálogo</p>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-gray-100 px-4 py-2">
      {items.map((c) => {
        const isSelected = !deselected?.has(c.id_item)
        return (
        <li key={c.id_item} className={cn("flex items-start gap-2 py-3 transition-opacity", !isSelected && onToggleSelect && "opacity-50")}>
          {onToggleSelect && (
            <div
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onToggleSelect(c.id_item)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggleSelect(c.id_item) } }}
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1",
                isSelected ? "bg-[#020617] border-[#020617]" : "bg-white border-gray-300"
              )}
            >
              {isSelected && (
                <svg className="h-2.5 w-2.5 text-lime" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{c.producto}</p>
            <p className="text-xs text-gray-500">S/ {fmt(c.precio_unitario_momento)} c/u</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <RippleButton
              type="button"
              onClick={() => onUpdateQty(c.id_item, -1)}
              disabled={c.cantidad <= 1}
              rippleColor="rgba(0,0,0,0.1)"
              duration="400ms"
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Reducir cantidad"
            >
              <Minus className="h-3 w-3" />
            </RippleButton>
            <span className="w-6 text-center text-sm tabular-nums font-medium text-gray-900">{c.cantidad}</span>
            <RippleButton
              type="button"
              onClick={() => onUpdateQty(c.id_item, 1)}
              disabled={c.cantidad >= c.stock_disponible}
              rippleColor="rgba(0,0,0,0.1)"
              duration="400ms"
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Incrementar cantidad"
            >
              <Plus className="h-3 w-3" />
            </RippleButton>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">S/ {fmt(c.importe)}</span>
          <RippleButton
            type="button"
            onClick={() => onRemove(c.id_item)}
            rippleColor="rgba(239,68,68,0.2)"
            duration="400ms"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label="Eliminar producto"
          >
            <X className="h-3.5 w-3.5" />
          </RippleButton>
        </li>
        )
      })}
    </ul>
  )
}

// ─── CatalogoPage (POS) ───────────────────────────────────────────────────────

export default function CatalogoPage() {
  const router = useRouter()

  // catalog
  const [catalogoItems, setCatalogoItems] = useState<CatalogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [catalogoError, setCatalogoError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [soloConStock, setSoloConStock] = useState(true)
  const [selectedCategoria, setSelectedCategoria] = useState<string>("")
  const [selectedModelo, setSelectedModelo] = useState<string>("")
  const [soloConPromo, setSoloConPromo] = useState(false)
  const [selectedMarca, setSelectedMarca] = useState<string>("")
  const [catalogoPage, setCatalogoPage] = useState(1)
  const CATALOGO_LIMIT = 12
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // cart
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [sidebarDeselected, setSidebarDeselected] = useState<Set<number>>(new Set())
  const cartSaveEnabled = useRef(false)
  const hasAutoOpenedRef = useRef(false)

  // sale modal
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [saleSuccess, setSaleSuccess] = useState(false)

  // discount
  const [tipoDescuento, setTipoDescuento] = useState<"porcentaje" | "monto_fijo">("monto_fijo")
  const [valorDescuento, setValorDescuento] = useState<string>("0")
  const [justificacionDescuento, setJustificacionDescuento] = useState<string>("")

  // client search
  const [clienteSearch, setClienteSearch] = useState("")
  const [allClientes, setAllClientes] = useState<ClienteVista[]>([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<ClienteVista | null>(null)
  const clienteDropdownRef = useRef<HTMLDivElement>(null)
  const clientesLoadedRef = useRef(false)

  useEffect(() => {
    // Razonamiento: diferir hidratación evita setState síncrono dentro del efecto inicial.
    const loadCartTimeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("guru_cart_v1")
        if (saved) setCartItems(JSON.parse(saved) as CartItem[])
      } catch { /* ignore */ }
      setCartLoaded(true)
    }, 0)
    return () => window.clearTimeout(loadCartTimeout)
  }, [])

  useEffect(() => {
    // Skip first run (initial mount with empty state) to avoid overwriting persisted cart
    if (!cartSaveEnabled.current) {
      cartSaveEnabled.current = true
      return
    }
    localStorage.setItem("guru_cart_v1", JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    if (!cartLoaded || hasAutoOpenedRef.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("openSale") !== "1") return
    hasAutoOpenedRef.current = true
    window.history.replaceState({}, "", window.location.pathname)
    const openSaleTimeout = window.setTimeout(() => {
      if (cartItems.length <= 0) return
      if (!clientesLoadedRef.current) {
        clientesLoadedRef.current = true
        getClientes().then(setAllClientes).catch(() => {})
      }
      setShowSaleModal(true)
    }, 0)
    return () => window.clearTimeout(openSaleTimeout)
  }, [cartLoaded, cartItems])

  // create client form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTipoDoc, setNewTipoDoc] = useState<"DNI" | "CE" | "pasaporte">("DNI")
  const [newNroDoc, setNewNroDoc] = useState("")
  const [newNombre, setNewNombre] = useState("")
  const [newTelefono, setNewTelefono] = useState("")
  const [newDireccion, setNewDireccion] = useState("")
  const [creatingCliente, setCreatingCliente] = useState(false)

  // split payments
  const [pagos, setPagos] = useState<{ metodo: MetodoPago; monto: string }[]>([
    { metodo: "efectivo", monto: "" },
  ])

  // submission
  const [submitting, setSubmitting] = useState(false)
  const [boletaUrl, setBoletaUrl] = useState<string | null>(null)

  // derived
  const cartMap = useMemo(
    () => new Map(cartItems.map((c) => [c.id_item, c])),
    [cartItems]
  )

  const categorias = useMemo(
    () => Array.from(new Set(catalogoItems.map((i) => i.categoria))).sort(),
    [catalogoItems]
  )

  const marcas = useMemo(
    () =>
      Array.from(
        new Set(
          catalogoItems
            .filter((i) => !selectedCategoria || i.categoria === selectedCategoria)
            .map((i) => i.marca)
            .filter((m): m is string => m !== null && m !== "")
        )
      ).sort(),
    [catalogoItems, selectedCategoria]
  )

  const modelos = useMemo(
    () =>
      Array.from(
        new Set(
          catalogoItems
            .filter((i) => !selectedCategoria || i.categoria === selectedCategoria)
            .filter((i) => !selectedMarca || i.marca === selectedMarca)
            .map((i) => i.modelo)
            .filter((m): m is string => m !== null && m !== "")
        )
      ).sort(),
    [catalogoItems, selectedCategoria, selectedMarca]
  )

  const filteredItems = useMemo(() => {
    return catalogoItems.filter((item) => {
      if (selectedCategoria && item.categoria !== selectedCategoria) return false
      if (selectedMarca && item.marca !== selectedMarca) return false
      if (selectedModelo && item.modelo !== selectedModelo) return false
      if (soloConPromo) {
        const hasPromo =
          item.precio_con_descuento != null &&
          item.precio_con_descuento !== 0 &&
          Number(item.precio_con_descuento) < Number(item.precio_venta_actual)
        if (!hasPromo) return false
      }
      return true
    })
  }, [catalogoItems, selectedCategoria, selectedMarca, selectedModelo, soloConPromo])

  const subtotal = useMemo(() => cartItems.reduce((s, c) => s + c.importe, 0), [cartItems])
  const totalItems = useMemo(() => cartItems.reduce((s, c) => s + c.cantidad, 0), [cartItems])

  // sidebar selection helpers
  const sidebarSelectedItems = useMemo(
    () => cartItems.filter((i) => !sidebarDeselected.has(i.id_item)),
    [cartItems, sidebarDeselected],
  )
  const sidebarSubtotal = useMemo(
    () => sidebarSelectedItems.reduce((s, c) => s + c.importe, 0),
    [sidebarSelectedItems],
  )
  const sidebarSubtotalOriginal = useMemo(
    () =>
      sidebarSelectedItems.reduce((s, c) => {
        const base = c.precio_normal_momento ?? c.precio_unitario_momento
        return s + base * c.cantidad
      }, 0),
    [sidebarSelectedItems],
  )
  const sidebarHasPromo = sidebarSubtotalOriginal > sidebarSubtotal
  const sidebarTotalItems = useMemo(
    () => sidebarSelectedItems.reduce((s, c) => s + c.cantidad, 0),
    [sidebarSelectedItems],
  )
  const sidebarAllSelected = cartItems.length > 0 && sidebarDeselected.size === 0

  function toggleSidebarSelect(id: number) {
    setSidebarDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllSidebar() {
    if (sidebarAllSelected) setSidebarDeselected(new Set(cartItems.map((i) => i.id_item)))
    else setSidebarDeselected(new Set())
  }
  const montoDescuento = (() => {
    const v = parseFloat(valorDescuento) || 0
    if (tipoDescuento === "porcentaje") return Math.min(subtotal, (subtotal * v) / 100)
    return Math.min(subtotal, Math.max(0, v))
  })()
  const total = subtotal - montoDescuento
  const totalPagado = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
  const restante = Math.max(0, total - totalPagado)
  const vuelto = Math.max(0, totalPagado - total)

  const catalogoTotalPages = useMemo(
    () => Math.ceil(filteredItems.length / CATALOGO_LIMIT),
    [filteredItems],
  )
  const paginatedCatalogoItems = useMemo(
    () => filteredItems.slice((catalogoPage - 1) * CATALOGO_LIMIT, catalogoPage * CATALOGO_LIMIT),
    [filteredItems, catalogoPage],
  )

  const filteredClientes = useMemo(
    () =>
      clienteSearch.trim()
        ? allClientes.filter(
            (c) =>
              c.nombre_completo.toLowerCase().includes(clienteSearch.toLowerCase()) ||
              c.nro_documento.includes(clienteSearch)
          )
        : allClientes,
    [clienteSearch, allClientes]
  )

  const fetchItems = useCallback(async (nombre: string, conStock: boolean) => {
    setLoading(true)
    setCatalogoError(null)
    try {
      const data = await getCatalogo({ nombre: nombre.trim() || undefined, con_stock: conStock || undefined })
      const seen = new Set<number>()
      setCatalogoItems(
        data.filter((item) => !seen.has(item.id_item) && (seen.add(item.id_item) as unknown as true))
      )
      setCatalogoPage(1)
    } catch {
      setCatalogoError("No se pudo cargar el catálogo. Verifica tu conexión e intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Razonamiento: diferir carga inicial evita setState síncrono dentro del efecto.
    const initialFetchTimeout = window.setTimeout(() => {
      void fetchItems("", true)
    }, 0)
    return () => window.clearTimeout(initialFetchTimeout)
  }, [fetchItems])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick, { passive: true })
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchItems(value, soloConStock), 300)
    },
    [fetchItems, soloConStock]
  )

  const handleToggleStock = useCallback(
    (checked: boolean) => {
      setSoloConStock(checked)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      fetchItems(search, checked)
    },
    [fetchItems, search]
  )

  const handleCategoriaChange = useCallback((value: string) => {
    setSelectedCategoria(value)
    setSelectedMarca("")
    setSelectedModelo("")
    setCatalogoPage(1)
  }, [])

  const addToCart = useCallback((item: CatalogoItem) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id_item === item.id_item)
      if (existing) {
        if (existing.cantidad >= item.stock_disponible) return prev
        const newQty = existing.cantidad + 1
        return prev.map((c) =>
          c.id_item === item.id_item ? { ...c, cantidad: newQty, importe: newQty * c.precio_unitario_momento } : c
        )
      }
      const hasPromo = item.precio_con_descuento !== null &&
        item.precio_con_descuento !== undefined &&
        Number(item.precio_con_descuento) < Number(item.precio_venta_actual)
      const precio = Number(hasPromo ? item.precio_con_descuento : item.precio_venta_actual)
      return [
        ...prev,
        {
          id_item: item.id_item,
          producto: item.producto,
          sku: item.sku,
          precio_unitario_momento: precio,
          precio_normal_momento: hasPromo ? Number(item.precio_venta_actual) : null,
          costo_unitario_momento: 0,
          cantidad: 1,
          importe: precio,
          stock_disponible: item.stock_disponible,
        },
      ]
    })
  }, [])

  const updateQty = useCallback((id_item: number, delta: number) => {
    setCartItems((prev) =>
      prev.map((c) => {
        if (c.id_item !== id_item) return c
        const newQty = Math.min(c.stock_disponible, Math.max(1, c.cantidad + delta))
        return { ...c, cantidad: newQty, importe: newQty * c.precio_unitario_momento }
      })
    )
  }, [])

  const removeItem = useCallback((id_item: number) => {
    setCartItems((prev) => prev.filter((c) => c.id_item !== id_item))
  }, [])

  function clearSaleState() {
    setSelectedCliente(null)
    setClienteSearch("")
    setValorDescuento("0")
    setJustificacionDescuento("")
    setPagos([{ metodo: "efectivo", monto: "" }])
    setBoletaUrl(null)
    setShowCreateForm(false)
    setNewNroDoc("")
    setNewNombre("")
    setNewTelefono("")
    setNewDireccion("")
    setNewTipoDoc("DNI")
  }

  function addPago() {
    setPagos((prev) => [...prev, { metodo: "efectivo", monto: "" }])
  }

  function removePago(idx: number) {
    setPagos((prev) => prev.filter((_, i) => i !== idx))
  }

  function updatePago(idx: number, field: "metodo" | "monto", value: string) {
    setPagos((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
  }

  function fillRestante(idx: number) {
    const otrosPagos = pagos.reduce((sum, p, i) => (i === idx ? sum : sum + (parseFloat(p.monto) || 0)), 0)
    const needed = Math.max(0, total - otrosPagos)
    updatePago(idx, "monto", needed > 0 ? needed.toFixed(2) : "")
  }

  async function handleCreateCliente() {
    if (!newNroDoc.trim() || !newNombre.trim()) {
      toast.error("Nro. documento y nombre son requeridos")
      return
    }
    setCreatingCliente(true)
    try {
      const cliente = await createCliente({
        tipo_documento: newTipoDoc,
        nro_documento: newNroDoc.trim(),
        nombre_completo: newNombre.trim(),
        telefono: newTelefono.trim() || undefined,
        direccion_completa: newDireccion.trim() || undefined,
      })
      setSelectedCliente(cliente)
      setAllClientes((prev) => [cliente, ...prev])
      setShowCreateForm(false)
      setNewNroDoc("")
      setNewNombre("")
      setNewTelefono("")
      setNewDireccion("")
      setNewTipoDoc("DNI")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear cliente")
    } finally {
      setCreatingCliente(false)
    }
  }

  async function handleConfirmSale() {
    if (cartItems.length === 0 || submitting) return

    if (montoDescuento > 0 && !justificacionDescuento.trim()) {
      toast.error("Ingresa el motivo del descuento")
      return
    }
    const pagosValidos = pagos.filter((p) => parseFloat(p.monto) > 0)
    if (pagosValidos.length === 0) {
      toast.error("Ingresa al menos un pago")
      return
    }
    if (restante > 0.01) {
      toast.error(`Falta cubrir S/ ${fmt(restante)} del total`)
      return
    }

    setSubmitting(true)
    try {
      const descuentoPayload =
        montoDescuento > 0
          ? {
              monto_descuento: parseFloat(valorDescuento) || 0,
              tipo_descuento: tipoDescuento,
              justificacion_descuento: justificacionDescuento,
            }
          : {}

      const venta = await createVenta({
        id_cliente: selectedCliente?.id_cliente,
        items: cartItems.map((item) => ({
          id_item: item.id_item,
          cantidad: Number(item.cantidad),
          precio_unitario_momento: Number(item.precio_unitario_momento),
          precio_normal_momento: item.precio_normal_momento ?? null,
          costo_unitario_momento: Number(item.costo_unitario_momento),
          importe: Number(item.importe),
        })),
        ...descuentoPayload,
      })

      await Promise.all(
        pagosValidos.map((pago) =>
          createPago(venta.id_venta, { metodo_pago: pago.metodo, monto: parseFloat(pago.monto) })
        )
      )

      try {
        const boleta = await emitirBoleta(venta.id_venta)
        setBoletaUrl(boleta.url_pdf)
      } catch {
        setBoletaUrl(null)
      }

      setSaleSuccess(true)
      setTimeout(() => {
        setCartItems([])
        clearSaleState()
        setShowSaleModal(false)
        setSaleSuccess(false)
      }, 1800)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar la venta")
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-bg-main min-h-full">

      {/* ══════════ SALE REGISTRATION MODAL ══════════ */}
      <BottomSheet
        open={showSaleModal}
        onClose={() => !submitting && setShowSaleModal(false)}
        disabled={submitting}
      >
              <div
                className="relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: "92dvh" }}
              >
                {/* Mobile handle */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                  <div className="h-1 w-10 rounded-full bg-gray-200" />
                </div>

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                      <Receipt className="h-4 w-4 text-gray-700" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Registrar venta</h2>
                      <p className="text-xs text-gray-400">
                        {totalItems} producto{totalItems !== 1 ? "s" : ""} · S/ {fmt(subtotal)}
                      </p>
                    </div>
                  </div>
                  {!submitting && (
                    <button
                      type="button"
                      onClick={() => setShowSaleModal(false)}
                      className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Success overlay */}
                <AnimatePresence>
                  {saleSuccess && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white rounded-t-3xl sm:rounded-2xl gap-3 px-6"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                      </div>
                      <p className="text-lg font-bold text-gray-900">¡Venta registrada!</p>
                      <p className="text-sm text-gray-500">Total cobrado: S/ {fmt(total)}</p>
                      {boletaUrl ? (
                        <a
                          href={boletaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <Receipt className="h-4 w-4" />
                          Ver boleta PDF
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400">Boleta disponible en historial de ventas</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5 flex flex-col gap-6">

                  {/* ── Descuentos ── */}
                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Descuento</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setTipoDescuento("porcentaje")}
                          className={cn(
                            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                            tipoDescuento === "porcentaje"
                              ? "bg-white shadow-sm text-gray-900"
                              : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoDescuento("monto_fijo")}
                          className={cn(
                            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                            tipoDescuento === "monto_fijo"
                              ? "bg-white shadow-sm text-gray-900"
                              : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          S/
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={tipoDescuento === "porcentaje" ? 100 : subtotal}
                        step="0.01"
                        value={valorDescuento}
                        onChange={(e) => setValorDescuento(e.target.value)}
                        className="h-9 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm tabular-nums text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {montoDescuento > 0 && (
                        <span className="shrink-0 text-sm font-semibold text-emerald-600 tabular-nums">
                          -S/ {fmt(montoDescuento)}
                        </span>
                      )}
                    </div>
                    <AnimatePresence>
                      {montoDescuento > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 px-0.5 pb-0.5">
                            <input
                              type="text"
                              placeholder="Motivo del descuento (requerido)"
                              value={justificacionDescuento}
                              onChange={(e) => setJustificacionDescuento(e.target.value)}
                              className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* ── Cliente ── */}
                  <section className="min-w-0">
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cliente</h3>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">Opcional</span>
                    </div>

                    {selectedCliente ? (
                      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 uppercase">
                          {selectedCliente.nombre_completo.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-blue-700">
                            {selectedCliente.nombre_completo}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedCliente.tipo_documento} {selectedCliente.nro_documento}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedCliente(null); setClienteSearch("") }}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 transition-colors"
                          aria-label="Quitar cliente"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex min-w-0 flex-col gap-2">
                        {/* Search existing */}
                        <div className="relative" ref={clienteDropdownRef}>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Buscar por nombre o documento…"
                              value={clienteSearch}
                              onChange={(e) => setClienteSearch(e.target.value)}
                              onFocus={() => setShowClienteDropdown(true)}
                              className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          {showClienteDropdown && filteredClientes.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                              {filteredClientes.map((c) => (
                                <button
                                  key={c.id_cliente}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCliente(c)
                                    setClienteSearch("")
                                    setShowClienteDropdown(false)
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 uppercase">
                                    {c.nombre_completo.charAt(0)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-900">{c.nombre_completo}</p>
                                    <p className="text-xs text-gray-400">{c.tipo_documento} {c.nro_documento}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Create new client toggle */}
                        <button
                          type="button"
                          onClick={() => setShowCreateForm((v) => !v)}
                          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <UserPlus className="h-4 w-4" />
                          Crear cliente nuevo
                          <ChevronDown
                            className={cn(
                              "ml-auto h-4 w-4 transition-transform duration-200",
                              showCreateForm && "rotate-180"
                            )}
                          />
                        </button>

                        <AnimatePresence>
                          {showCreateForm && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="w-full overflow-hidden"
                            >
                              <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div className="flex min-w-0 gap-2">
                                  <div className="relative w-28 shrink-0">
                                    <select
                                      value={newTipoDoc}
                                      onChange={(e) => setNewTipoDoc(e.target.value as typeof newTipoDoc)}
                                      className="h-9 w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 pr-7 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      {TIPOS_DOC.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Nro. documento *"
                                    value={newNroDoc}
                                    onChange={(e) => setNewNroDoc(e.target.value)}
                                    className="h-9 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Nombre completo *"
                                  value={newNombre}
                                  onChange={(e) => setNewNombre(e.target.value)}
                                  className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex min-w-0 gap-2">
                                  <input
                                    type="tel"
                                    placeholder="Teléfono"
                                    value={newTelefono}
                                    onChange={(e) => setNewTelefono(e.target.value)}
                                    className="h-9 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Dirección"
                                    value={newDireccion}
                                    onChange={(e) => setNewDireccion(e.target.value)}
                                    className="h-9 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <Button
                                  onClick={handleCreateCliente}
                                  disabled={creatingCliente || !newNroDoc.trim() || !newNombre.trim()}
                                  size="sm"
                                  className="h-9 w-full gap-2 bg-[#020617] text-white hover:bg-[#0d1b38] disabled:opacity-40"
                                >
                                  {creatingCliente ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <UserPlus className="h-3.5 w-3.5" />
                                  )}
                                  Crear cliente
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </section>

                  {/* ── Pagos ── */}
                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Pagos</h3>

                    <div className="flex flex-col gap-2">
                      {pagos.map((pago, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {/* Method selector */}
                          <div className="relative w-36 shrink-0">
                            <select
                              value={pago.metodo}
                              onChange={(e) => updatePago(idx, "metodo", e.target.value)}
                              className="h-9 w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 pr-7 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {METODOS.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                          </div>

                          {/* Amount */}
                          <div className="relative flex-1">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S/</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pago.monto}
                              onChange={(e) => updatePago(idx, "monto", e.target.value)}
                              placeholder={fmt(restante > 0 ? restante : 0)}
                              className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm tabular-nums text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* Fill remaining shortcut */}
                          {restante > 0.01 && !pago.monto && (
                            <button
                              type="button"
                              onClick={() => fillRestante(idx)}
                              className="shrink-0 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors whitespace-nowrap"
                            >
                              +{fmt(restante)}
                            </button>
                          )}

                          {/* Remove row */}
                          {pagos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePago(idx)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              aria-label="Quitar pago"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add payment row */}
                    <button
                      type="button"
                      onClick={addPago}
                      className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Agregar otro medio de pago
                    </button>

                    {/* Payment summary */}
                    <AnimatePresence>
                      {totalPagado > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Pagado</span>
                              <span className="tabular-nums font-medium text-gray-900">S/ {fmt(totalPagado)}</span>
                            </div>
                            {restante > 0.01 && (
                              <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                                <span className="text-sm text-red-700">Pendiente</span>
                                <span className="text-sm font-bold tabular-nums text-red-700">S/ {fmt(restante)}</span>
                              </div>
                            )}
                            {vuelto > 0.01 && (
                              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                                <span className="text-sm text-emerald-700">Vuelto</span>
                                <span className="text-sm font-bold tabular-nums text-emerald-700">S/ {fmt(vuelto)}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-gray-100 px-5 py-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    {montoDescuento > 0 && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Descuento</span>
                        <span className="tabular-nums text-emerald-600">-S/ {fmt(montoDescuento)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold tabular-nums text-[#020617]">S/ {fmt(total)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleConfirmSale}
                    disabled={submitting || cartItems.length === 0}
                    className="h-12 w-full gap-2 bg-lime hover:bg-[#d4f96a] text-[#020617] text-sm font-bold disabled:opacity-40 shadow-[0_0_20px_rgba(172,248,71,0.3)]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Registrando…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmar venta
                      </>
                    )}
                  </Button>
                </div>
              </div>
      </BottomSheet>

      <div className="flex">
        {/* ══════════ LEFT: product grid ══════════ */}
        <div className="flex-1 min-w-0 p-4 sm:p-6">
          <BlurFade delay={0} duration={0.5}>
            <div className="mb-8">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                  <Package className="h-4 w-4 text-gray-900" />
                </div>
                <h1 className="text-2xl font-bold text-text-heading">Catálogo</h1>
              </div>
              <p className="mt-1.5 text-sm text-text-muted">Selecciona productos para agregar al carrito</p>
            </div>
          </BlurFade>

          <BlurFade delay={0.08} duration={0.5}>
            <div className="mb-6 flex flex-col gap-3">
              {/* Row 1: search + toggles */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Buscar producto…"
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex cursor-pointer items-center gap-2.5 select-none">
                    <div
                      role="switch"
                      aria-checked={soloConStock}
                      tabIndex={0}
                      onClick={() => handleToggleStock(!soloConStock)}
                      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleToggleStock(!soloConStock) } }}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1",
                        soloConStock ? "bg-[#020617]" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                          soloConStock ? "translate-x-4" : "translate-x-0.5"
                        )}
                      />
                    </div>
                    <span className="text-sm text-gray-600">Solo con stock</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 select-none">
                    <div
                      role="switch"
                      aria-checked={soloConPromo}
                      tabIndex={0}
                      onClick={() => { setSoloConPromo((v) => !v); setCatalogoPage(1) }}
                      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setSoloConPromo((v) => !v); setCatalogoPage(1) } }}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
                        soloConPromo ? "bg-blue-500" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                          soloConPromo ? "translate-x-4" : "translate-x-0.5"
                        )}
                      />
                    </div>
                    <span className="text-sm text-gray-600">En promoción</span>
                  </label>
                </div>
              </div>

              {/* Row 2: category + brand + model selects */}
              {(categorias.length > 0 || marcas.length > 0 || modelos.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />

                  {categorias.length > 0 && (
                    <div className="relative">
                      <select
                        value={selectedCategoria}
                        onChange={(e) => handleCategoriaChange(e.target.value)}
                        aria-label="Filtrar por categoría"
                        className="h-8 appearance-none rounded-xl border border-gray-300 bg-white pl-3 pr-7 text-xs text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todas las categorías</option>
                        {categorias.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                    </div>
                  )}

                  {marcas.length > 0 && (
                    <div className="relative">
                      <select
                        value={selectedMarca}
                        onChange={(e) => { setSelectedMarca(e.target.value); setSelectedModelo(""); setCatalogoPage(1) }}
                        aria-label="Filtrar por marca"
                        className="h-8 appearance-none rounded-xl border border-gray-300 bg-white pl-3 pr-7 text-xs text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todas las marcas</option>
                        {marcas.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                    </div>
                  )}

                  {modelos.length > 0 && (
                    <div className="relative">
                      <select
                        value={selectedModelo}
                        onChange={(e) => { setSelectedModelo(e.target.value); setCatalogoPage(1) }}
                        aria-label="Filtrar por modelo"
                        className="h-8 appearance-none rounded-xl border border-gray-300 bg-white pl-3 pr-7 text-xs text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos los modelos</option>
                        {modelos.map((mod) => (
                          <option key={mod} value={mod}>{mod}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                    </div>
                  )}

                  {(selectedCategoria || selectedMarca || selectedModelo || soloConPromo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoria("")
                        setSelectedMarca("")
                        setSelectedModelo("")
                        setSoloConPromo(false)
                        setCatalogoPage(1)
                      }}
                      className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}
            </div>
          </BlurFade>

          {!loading && !catalogoError && (
            <BlurFade delay={0.12} duration={0.4}>
              <p className="mb-4 text-xs text-gray-500">
                {filteredItems.length === 0
                  ? "Sin resultados"
                  : `${filteredItems.length} producto${filteredItems.length !== 1 ? "s" : ""}`}
              </p>
            </BlurFade>
          )}

          {loading && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                  </div>
                  <div className="mb-4 flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && catalogoError && (
            <BlurFade delay={0} duration={0.4}>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
                <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
                <p className="mb-1 text-sm font-medium text-gray-900">Error al cargar</p>
                <p className="mb-5 max-w-xs text-xs text-gray-500">{catalogoError}</p>
                <Button variant="outline" size="sm" onClick={() => fetchItems(search, soloConStock)}>
                  Reintentar
                </Button>
              </div>
            </BlurFade>
          )}

          {!loading && !catalogoError && catalogoItems.length === 0 && (
            <BlurFade delay={0} duration={0.4}>
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">Sin resultados</p>
                <p className="text-xs text-gray-400">
                  {search
                    ? `No hay resultados para "${search}"`
                    : soloConStock
                      ? "No hay productos con stock disponible"
                      : "Prueba con otro término de búsqueda"}
                </p>
              </div>
            </BlurFade>
          )}

          {!loading && !catalogoError && catalogoItems.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {paginatedCatalogoItems.map((item, i) => (
                <ProductCard
                  key={item.id_item}
                  item={item}
                  delay={Math.min(i * 0.05, 0.3)}
                  onAdd={addToCart}
                  inCart={cartMap.has(item.id_item)}
                  cartQty={cartMap.get(item.id_item)?.cantidad ?? 0}
                />
              ))}
            </div>
          )}

          {!loading && !catalogoError && catalogoTotalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                disabled={catalogoPage <= 1}
                onClick={() => setCatalogoPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
              <span className="text-xs text-gray-500">
                Página{" "}
                <span className="font-semibold text-gray-900">{catalogoPage}</span> de{" "}
                <span className="font-semibold text-gray-900">{catalogoTotalPages}</span>
              </span>
              <button
                disabled={catalogoPage >= catalogoTotalPages}
                onClick={() => setCatalogoPage((p) => Math.min(catalogoTotalPages, p + 1))}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ══════════ RIGHT: cart sidebar ══════════ */}
        <div className="hidden lg:flex lg:w-[320px] xl:w-[380px] shrink-0 flex-col bg-gray-100 sticky top-0 h-[calc(100vh-5rem)] overflow-hidden p-3 gap-3">

          {/* ── TOP: Subtotal + CTA ── */}
          <div className="shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
            {cartItems.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-1">Agrega productos al carrito</p>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {sidebarTotalItems} producto{sidebarTotalItems !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-gray-500">Subtotal</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums text-[#020617]">S/ {fmt(sidebarSubtotal)}</span>
                    {sidebarHasPromo && (
                      <span className="text-sm tabular-nums text-gray-400 line-through">S/ {fmt(sidebarSubtotalOriginal)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <InteractiveHoverButton
              onClick={() => router.push("/dashboard/catalogo/carrito")}
              disabled={cartItems.length === 0}
              text="Ir al carrito"
              icon={<ShoppingCart className="h-4 w-4" />}
              className="h-11 w-full rounded-xl bg-lime text-[#020617] text-sm shadow-[0_0_20px_rgba(172,248,71,0.3)]"
            />
          </div>

          {/* ── BOTTOM: Cart items ── */}
          <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">Carrito</h2>
                {cartItems.length > 0 && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-500">
                    {cartItems.length}
                  </span>
                )}
              </div>
              {cartItems.length > 0 && (
                <InteractiveHoverButton
                  onClick={() => setCartItems([])}
                  text="Vaciar"
                  icon={<Trash2 className="h-3 w-3" />}
                  fillClassName="bg-red-700"
                  className="h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs px-2.5"
                />
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="shrink-0 flex items-center gap-2 border-b border-gray-50 px-4 py-2">
                <div
                  role="checkbox"
                  aria-checked={sidebarAllSelected}
                  tabIndex={0}
                  onClick={toggleAllSidebar}
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleAllSidebar() } }}
                  className={cn(
                    "h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1",
                    sidebarAllSelected ? "bg-[#020617] border-[#020617]" : "bg-white border-gray-300"
                  )}
                >
                  {sidebarAllSelected && (
                    <svg className="h-2.5 w-2.5 text-lime" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-500 select-none">Seleccionar todo</span>
              </div>
            )}
            <div className="flex-1 min-h-0">
              <div
                className="overflow-y-auto h-full"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%)",
                }}
              >
                <CartItemsList
                  items={cartItems}
                  onUpdateQty={updateQty}
                  onRemove={removeItem}
                  deselected={sidebarDeselected}
                  onToggleSelect={toggleSidebarSelect}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating cart button */}
      <div className="fixed bottom-6 right-6 lg:hidden z-30">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#020617] text-lime shadow-lg shadow-black/30 transition-transform active:scale-95"
          aria-label="Ver carrito"
        >
          <ShoppingCart className="h-6 w-6" />
          {cartItems.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-lime text-[10px] font-bold text-[#020617]">
              {cartItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Mobile cart drawer */}
      <BottomSheet
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        wrapperClassName="lg:hidden"
      >
        <div
          className="flex flex-col rounded-t-3xl sm:rounded-2xl bg-white"
          style={{ maxHeight: "85dvh" }}
        >
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Carrito</h2>
              {cartItems.length > 0 && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-500">
                  {cartItems.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {cartItems.length > 0 && (
                <InteractiveHoverButton
                  onClick={() => setCartItems([])}
                  text="Vaciar"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  fillClassName="bg-red-700"
                  className="h-8 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs px-3"
                />
              )}
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                aria-label="Cerrar carrito"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {cartItems.length > 0 && (
            <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-5 py-2">
              <div
                role="checkbox"
                aria-checked={sidebarAllSelected}
                tabIndex={0}
                onClick={toggleAllSidebar}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleAllSidebar() } }}
                className={cn(
                  "h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1",
                  sidebarAllSelected ? "bg-[#020617] border-[#020617]" : "bg-white border-gray-300"
                )}
              >
                {sidebarAllSelected && (
                  <svg className="h-2.5 w-2.5 text-lime" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-gray-500 select-none">Seleccionar todo</span>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <div
              className="overflow-y-auto h-full"
              style={{
                maskImage: "linear-gradient(to bottom, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%)",
              }}
            >
              <CartItemsList
                items={cartItems}
                onUpdateQty={updateQty}
                onRemove={removeItem}
                deselected={sidebarDeselected}
                onToggleSelect={toggleSidebarSelect}
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-100 px-5 py-4 flex flex-col gap-3">
            {cartItems.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Subtotal ({sidebarTotalItems} producto{sidebarTotalItems !== 1 ? "s" : ""})
                </span>
                <div className="flex items-center gap-2">
                  {sidebarHasPromo && (
                    <span className="text-xs tabular-nums text-gray-400 line-through">S/ {fmt(sidebarSubtotalOriginal)}</span>
                  )}
                  <span className="text-base font-bold tabular-nums text-gray-900">S/ {fmt(sidebarSubtotal)}</span>
                </div>
              </div>
            )}
            <InteractiveHoverButton
              onClick={() => { setMobileCartOpen(false); router.push("/dashboard/catalogo/carrito") }}
              disabled={cartItems.length === 0}
              text="Ir al carrito"
              icon={<ShoppingCart className="h-4 w-4" />}
              className="h-12 w-full rounded-xl bg-lime text-[#020617] text-base shadow-[0_0_20px_rgba(172,248,71,0.3)]"
            />
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
