export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a] py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <p className="font-bold text-white">Guru Tech Store</p>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              Sistema de gestión de precisión para negocios multisede.
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Plataforma</p>
            <ul className="space-y-2 text-sm text-zinc-500">
              {["Inventario", "Ventas", "Personal", "Reportes"].map((item) => (
                <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Términos de servicio</p>
            <ul className="space-y-2 text-sm text-zinc-500">
              {["Privacidad", "Términos", "Cookies"].map((item) => (
                <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Seguridad</p>
            <ul className="space-y-2 text-sm text-zinc-500">
              {["Documentación", "Soporte", "Estado del sistema"].map((item) => (
                <li key={item}><a href="#" className="transition-colors hover:text-white">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-600">
            © 2026 GURU TECH STORE. SISTEMA DE GESTIÓN DE PRECISIÓN.
          </p>
        </div>
      </div>
    </footer>
  )
}
