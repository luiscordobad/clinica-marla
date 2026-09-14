"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { obtenerEstadoSesion, type SesionActual } from '../../lib/auth'
import type { RolUsuario, Usuario } from '../../lib/types'

export default function Usuarios() {
  const [cargando, setCargando] = useState(true)
  const [sesion, setSesion] = useState<SesionActual | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const cargar = async () => {
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: true })
    if (data) setUsuarios(data as Usuario[])
  }

  useEffect(() => {
    const iniciar = async () => {
      const estado = await obtenerEstadoSesion()
      if (estado.tipo !== 'activa') { window.location.href = '/login'; return }
      if (!estado.sesion.esFullAccess) { window.location.href = '/'; return }
      setSesion(estado.sesion)
      await cargar()
      setCargando(false)
    }
    iniciar()
  }, [])

  const mostrarToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const actualizarUsuario = async (id: string, cambios: Partial<Pick<Usuario, 'rol' | 'activo'>>) => {
    setGuardandoId(id)
    const { error } = await supabase.from('usuarios').update(cambios).eq('id', id)
    if (!error) { await cargar(); mostrarToast('Cambios guardados') } else mostrarToast('Error: ' + error.message)
    setGuardandoId(null)
  }

  if (cargando) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><p className="animate-pulse font-bold text-[#0066FF]">Cargando...</p></div>

  const pendientes = usuarios.filter(u => !u.activo)
  const activos = usuarios.filter(u => u.activo)

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6 md:p-10">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#00D084] text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm">{toast}</div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Usuarios y Accesos</h1>
            <p className="text-sm text-slate-500 mt-1">Aprueba cuentas nuevas y decide quién ve qué.</p>
          </div>
          <Link href="/" className="text-sm font-bold text-[#0066FF] hover:underline">← Regresar</Link>
        </div>

        {pendientes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3">⏳ Pendientes de aprobación ({pendientes.length})</h2>
            <div className="space-y-3">
              {pendientes.map(u => (
                <div key={u.id} className="bg-white border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <p className="font-black text-slate-800">{u.nombre}</p>
                    <p className="text-sm text-slate-500">{u.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      defaultValue="operativo"
                      id={`rol-nuevo-${u.id}`}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                    >
                      <option value="operativo">Personal Administrativo</option>
                      <option value="full_access">Acceso Total</option>
                    </select>
                    <button
                      disabled={guardandoId === u.id}
                      onClick={() => {
                        const sel = document.getElementById(`rol-nuevo-${u.id}`) as HTMLSelectElement
                        actualizarUsuario(u.id, { activo: true, rol: sel.value as RolUsuario })
                      }}
                      className="bg-[#00D084] text-white px-4 py-2.5 rounded-xl text-sm font-black hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      ✅ Aprobar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Cuentas activas ({activos.length})</h2>
        <div className="space-y-3">
          {activos.map(u => {
            const esUnoMismo = sesion?.usuario.id === u.id
            return (
              <div key={u.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <p className="font-black text-slate-800">{u.nombre} {esUnoMismo && <span className="text-[10px] text-[#0066FF] font-black ml-1">(TÚ)</span>}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={u.rol}
                    disabled={esUnoMismo || guardandoId === u.id}
                    onChange={(e) => actualizarUsuario(u.id, { rol: e.target.value as RolUsuario })}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none disabled:opacity-50"
                  >
                    <option value="operativo">Personal Administrativo</option>
                    <option value="full_access">Acceso Total</option>
                  </select>
                  <button
                    disabled={esUnoMismo || guardandoId === u.id}
                    onClick={() => actualizarUsuario(u.id, { activo: false })}
                    className="text-rose-500 text-xs font-bold px-3 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-40"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-[#0066FF]">
          <p className="font-bold mb-1">¿Cómo le doy acceso a alguien nuevo?</p>
          <p>Pídele que entre a la pantalla de inicio de sesión y toque "Personal nuevo, crea tu cuenta aquí". En cuanto se registre, aparecerá aquí arriba en "Pendientes de aprobación" para que le asignes su nivel de acceso.</p>
        </div>
      </div>
    </div>
  )
}
