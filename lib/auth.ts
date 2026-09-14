import { supabase } from './supabase'
import type { Usuario } from './types'

export type SesionActual = {
  usuario: Usuario
  esFullAccess: boolean
}

// Resultado especial cuando hay sesión de auth pero la cuenta aún no fue
// aprobada por un usuario full_access (ver app/usuarios).
export type EstadoSesion =
  | { tipo: 'sin_sesion' }
  | { tipo: 'pendiente_aprobacion'; email: string }
  | { tipo: 'inactiva'; email: string }
  | { tipo: 'activa'; sesion: SesionActual }

export async function obtenerEstadoSesion(): Promise<EstadoSesion> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { tipo: 'sin_sesion' }

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error || !usuario) {
    // La fila en `usuarios` la crea un trigger al registrarse; si no existe
    // aún (carrera rara) tratamos la cuenta como pendiente, nunca como error fatal.
    return { tipo: 'pendiente_aprobacion', email: session.user.email || '' }
  }

  if (!usuario.activo) return { tipo: 'inactiva', email: usuario.email }

  return { tipo: 'activa', sesion: { usuario, esFullAccess: usuario.rol === 'full_access' } }
}
