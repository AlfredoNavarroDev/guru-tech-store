import { normalizeSession } from './auth'

const backendSession = normalizeSession({
  access_token: 'token',
  nombre: 'Admin Demo',
  rol: 'administrador',
  id_sede: 1,
  sede: 'Principal',
  id_empleado: 1,
})

const legacySession = normalizeSession({
  access_token: 'token',
  nombre: 'Vendedor Demo',
  roles: ['vendedor'],
  id_sede: 1,
  sede: 'Principal',
  id_empleado: 2,
})

backendSession satisfies {
  rol: 'administrador'
}

legacySession satisfies {
  rol: 'vendedor'
}
