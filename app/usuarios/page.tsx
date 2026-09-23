"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { obtenerEstadoSesion, type SesionActual } from '../../lib/auth'
import { useCierreAutomatico } from '../../lib/inactividad'
import type { RolUsuario, Usuario, Servicio, ConfiguracionClinica } from '../../lib/types'

type ActividadItem = {
  id: string
  cuando: string
  quien: string
  texto: string
  icono: string
}

export default function Usuarios() {
  const [cargando, setCargando] = useState(true)
  const [sesion, setSesion] = useState<SesionActual | null>(null)
  useCierreAutomatico(sesion?.usuario.auto_logout_minutos)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [vista, setVista] = useState<'perfil' | 'accesos' | 'servicios' | 'clinica' | 'actividad'>('perfil')

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [configClinica, setConfigClinica] = useState<ConfiguracionClinica | null>(null)
  const [formClinica, setFormClinica] = useState({ nombre_clinica: '', direccion: '', telefono_contacto: '', horario: '' })
  const [guardandoClinica, setGuardandoClinica] = useState(false)
  const [actividad, setActividad] = useState<ActividadItem[]>([])
  const [cargandoActividad, setCargandoActividad] = useState(false)

  const [formPerfil, setFormPerfil] = useState({ nombre: '', telefono: '', puesto: '', auto_logout_minutos: null as number | null })
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)

  const [formPassword, setFormPassword] = useState({ nueva: '', confirmar: '' })
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState<string | null>(null)

  const [nuevoCorreo, setNuevoCorreo] = useState('')
  const [cambiandoCorreo, setCambiandoCorreo] = useState(false)
  const [avisoCorreo, setAvisoCorreo] = useState<string | null>(null)

  const [ultimoAcceso, setUltimoAcceso] = useState<Record<string, string | null>>({})

  const cargar = async () => {
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: true })
    if (data) setUsuarios(data as Usuario[])
    const { data: accesos } = await supabase.rpc('usuarios_ultimo_acceso')
    if (accesos) {
      const mapa: Record<string, string | null> = {}
      accesos.forEach((a: { id: string; last_sign_in_at: string | null }) => { mapa[a.id] = a.last_sign_in_at })
      setUltimoAcceso(mapa)
    }
  }

  const formatearUltimoAcceso = (fecha: string | null | undefined) => {
    if (!fecha) return 'Nunca ha iniciado sesión'
    const diffMs = Date.now() - new Date(fecha).getTime()
    const minutos = Math.floor(diffMs / 60000)
    if (minutos < 5) return 'Activo ahora'
    if (minutos < 60) return `Activo hace ${minutos} min`
    const horas = Math.floor(minutos / 60)
    if (horas < 24) return `Activo hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`
    const dias = Math.floor(horas / 24)
    if (dias < 30) return `Activo hace ${dias} ${dias === 1 ? 'día' : 'días'}`
    return `Activo el ${new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  const cargarServicios = async () => {
    const { data } = await supabase.from('servicios').select('*').order('orden', { ascending: true })
    if (data) setServicios(data as Servicio[])
  }

  const cargarConfigClinica = async () => {
    const { data } = await supabase.from('configuracion_clinica').select('*').eq('id', true).single()
    if (data) {
      setConfigClinica(data as ConfiguracionClinica)
      setFormClinica({
        nombre_clinica: (data as ConfiguracionClinica).nombre_clinica || '',
        direccion: (data as ConfiguracionClinica).direccion || '',
        telefono_contacto: (data as ConfiguracionClinica).telefono_contacto || '',
        horario: (data as ConfiguracionClinica).horario || '',
      })
    }
  }

  const cargarActividad = async (usuariosCargados: Usuario[]) => {
    setCargandoActividad(true)
    const nombrePorId: Record<string, string> = {}
    usuariosCargados.forEach(u => { nombrePorId[u.id] = u.nombre })

    const [{ data: citasData }, { data: pagosData }, { data: consultasData }] = await Promise.all([
      supabase.from('citas').select('id, created_at, created_by, nombre_paciente, tipo').order('created_at', { ascending: false }).limit(15),
      supabase.from('pagos').select('id, fecha, created_by, monto_esperado, estado, concepto').order('fecha', { ascending: false }).limit(15),
      supabase.from('consultas').select('id, created_at, realizada_por, tipo, paciente_id').order('created_at', { ascending: false }).limit(15),
    ])

    let nombresPacientes: Record<string, string> = {}
    const idsPacientes = (consultasData || []).map((c: any) => c.paciente_id).filter(Boolean)
    if (idsPacientes.length > 0) {
      const { data: pData } = await supabase.from('pacientes').select('id, nombre_completo').in('id', idsPacientes)
      if (pData) pData.forEach((p: any) => { nombresPacientes[p.id] = p.nombre_completo })
    }

    const items: ActividadItem[] = [
      ...(citasData || []).map((c: any) => ({
        id: 'cita-' + c.id,
        cuando: c.created_at,
        quien: nombrePorId[c.created_by] || 'Sistema',
        texto: `Agendó una cita ${c.tipo === 'bloqueo' ? '(bloqueo)' : `para ${c.nombre_paciente || 'paciente'}`}`,
        icono: '📅',
      })),
      ...(pagosData || []).map((p: any) => ({
        id: 'pago-' + p.id,
        cuando: p.fecha,
        quien: nombrePorId[p.created_by] || 'Sistema',
        texto: `${p.estado === 'pagado' ? 'Cobró' : 'Generó cuenta de'} $${p.monto_esperado} — ${p.concepto || 'servicio'}`,
        icono: '💳',
      })),
      ...(consultasData || []).map((c: any) => ({
        id: 'consulta-' + c.id,
        cuando: c.created_at,
        quien: nombrePorId[c.realizada_por] || 'Sistema',
        texto: `Registró consulta (${c.tipo === 'primera_vez' ? 'primera vez' : 'seguimiento'}) de ${nombresPacientes[c.paciente_id] || 'paciente'}`,
        icono: '📝',
      })),
    ].sort((a, b) => new Date(b.cuando).getTime() - new Date(a.cuando).getTime()).slice(0, 25)

    setActividad(items)
    setCargandoActividad(false)
  }

  useEffect(() => {
    const iniciar = async () => {
      const estado = await obtenerEstadoSesion()
      if (estado.tipo !== 'activa') { window.location.href = '/login'; return }
      setSesion(estado.sesion)
      setFormPerfil({ nombre: estado.sesion.usuario.nombre || '', telefono: estado.sesion.usuario.telefono || '', puesto: estado.sesion.usuario.puesto || '', auto_logout_minutos: estado.sesion.usuario.auto_logout_minutos })
      if (estado.sesion.esFullAccess) {
        await cargar()
        await cargarServicios()
        await cargarConfigClinica()
      }
      setCargando(false)
    }
    iniciar()
  }, [])

  const mostrarToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const refrescarSesion = async () => {
    const estado = await obtenerEstadoSesion()
    if (estado.tipo === 'activa') setSesion(estado.sesion)
  }

  const guardarPerfil = async () => {
    if (!sesion) return
    if (!formPerfil.nombre.trim()) return mostrarToast('El nombre no puede quedar vacío')
    setGuardandoPerfil(true)
    const { error } = await supabase.from('usuarios').update({
      nombre: formPerfil.nombre.trim(),
      telefono: formPerfil.telefono.trim() || null,
      puesto: formPerfil.puesto.trim() || null,
      auto_logout_minutos: formPerfil.auto_logout_minutos,
    }).eq('id', sesion.usuario.id)
    if (!error) { await refrescarSesion(); if (sesion.esFullAccess) await cargar(); mostrarToast('Perfil actualizado') } else mostrarToast('Error: ' + error.message)
    setGuardandoPerfil(false)
  }

  const cambiarCorreo = async () => {
    setAvisoCorreo(null)
    if (!nuevoCorreo.trim() || !nuevoCorreo.includes('@')) return setAvisoCorreo('Escribe un correo válido.')
    setCambiandoCorreo(true)
    const { error } = await supabase.auth.updateUser({ email: nuevoCorreo.trim() })
    setCambiandoCorreo(false)
    if (error) return setAvisoCorreo('No se pudo cambiar: ' + error.message)
    setAvisoCorreo('Te enviamos un correo de confirmación a la nueva dirección. Da clic en el link para completar el cambio.')
    setNuevoCorreo('')
  }

  const subirAvatar = async (archivo: File) => {
    if (!sesion) return
    if (archivo.size > 3 * 1024 * 1024) return mostrarToast('La imagen debe pesar menos de 3MB')
    setSubiendoAvatar(true)
    const ext = archivo.name.split('.').pop() || 'jpg'
    const ruta = `${sesion.usuario.id}/avatar.${ext}`
    const { error: errSubida } = await supabase.storage.from('avatares').upload(ruta, archivo, { upsert: true })
    if (errSubida) { mostrarToast('Error subiendo foto: ' + errSubida.message); setSubiendoAvatar(false); return }
    const { data } = supabase.storage.from('avatares').getPublicUrl(ruta)
    const avatar_url = `${data.publicUrl}?t=${Date.now()}`
    const { error: errUpdate } = await supabase.from('usuarios').update({ avatar_url }).eq('id', sesion.usuario.id)
    if (!errUpdate) { await refrescarSesion(); if (sesion.esFullAccess) await cargar(); mostrarToast('Foto de perfil actualizada') } else mostrarToast('Error: ' + errUpdate.message)
    setSubiendoAvatar(false)
  }

  const cambiarPassword = async () => {
    setErrorPassword(null)
    if (formPassword.nueva.length < 6) return setErrorPassword('La contraseña debe tener al menos 6 caracteres.')
    if (formPassword.nueva !== formPassword.confirmar) return setErrorPassword('Las contraseñas no coinciden.')
    setCambiandoPassword(true)
    const { error } = await supabase.auth.updateUser({ password: formPassword.nueva })
    setCambiandoPassword(false)
    if (error) return setErrorPassword('No se pudo cambiar: ' + error.message)
    setFormPassword({ nueva: '', confirmar: '' })
    mostrarToast('Contraseña actualizada')
  }

  const actualizarUsuario = async (id: string, cambios: Partial<Pick<Usuario, 'rol' | 'activo'>>) => {
    setGuardandoId(id)
    const { error } = await supabase.from('usuarios').update(cambios).eq('id', id)
    if (!error) { await cargar(); mostrarToast('Cambios guardados') } else mostrarToast('Error: ' + error.message)
    setGuardandoId(null)
  }

  const actualizarServicio = async (id: string, cambios: Partial<Pick<Servicio, 'nombre' | 'precio' | 'activo'>>) => {
    const { error } = await supabase.from('servicios').update(cambios).eq('id', id)
    if (!error) { await cargarServicios() } else mostrarToast('Error: ' + error.message)
  }

  const agregarServicio = async () => {
    const orden = servicios.length > 0 ? Math.max(...servicios.map(s => s.orden)) + 1 : 1
    const { error } = await supabase.from('servicios').insert([{ nombre: 'Nuevo Servicio', precio: 0, icono: '🩺', orden }])
    if (!error) { await cargarServicios(); mostrarToast('Servicio agregado') } else mostrarToast('Error: ' + error.message)
  }

  const eliminarServicio = async (id: string) => {
    if (!window.confirm('¿Eliminar este servicio del catálogo?')) return
    const { error } = await supabase.from('servicios').delete().eq('id', id)
    if (!error) { await cargarServicios(); mostrarToast('Servicio eliminado') } else mostrarToast('Error: ' + error.message)
  }

  const guardarClinica = async () => {
    setGuardandoClinica(true)
    const { error } = await supabase.from('configuracion_clinica').update(formClinica).eq('id', true)
    if (!error) { await cargarConfigClinica(); mostrarToast('Perfil de clínica actualizado') } else mostrarToast('Error: ' + error.message)
    setGuardandoClinica(false)
  }

  if (cargando) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><p className="animate-pulse font-bold text-[#28363E]">Cargando...</p></div>

  const pendientes = usuarios.filter(u => !u.activo)
  const activos = usuarios.filter(u => u.activo)

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6 md:p-10">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#00D084] text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm">{toast}</div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Ajustes</h1>
            <p className="text-sm text-slate-500 mt-1">Tu perfil{sesion?.esFullAccess ? ', accesos, catálogo de servicios, perfil de la clínica y actividad reciente.' : '.'}</p>
          </div>
          <Link href="/" className="text-sm font-bold text-[#28363E] hover:underline">← Regresar</Link>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {[
            { id: 'perfil', l: '🙋 Mi Perfil' },
            ...(sesion?.esFullAccess ? [
              { id: 'accesos', l: '👥 Accesos' },
              { id: 'servicios', l: '🧾 Servicios' },
              { id: 'clinica', l: '🏥 Perfil de Clínica' },
              { id: 'actividad', l: '📋 Actividad' },
            ] : []),
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setVista(t.id as any); if (t.id === 'actividad' && actividad.length === 0) cargarActividad(usuarios) }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-colors ${vista === t.id ? 'bg-[#28363E] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {vista === 'perfil' && sesion && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-lg">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                {sesion.usuario.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={sesion.usuario.avatar_url} alt={sesion.usuario.nombre} className="w-20 h-20 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-black text-[#28363E] border border-slate-200">
                    {sesion.usuario.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                )}
                {subiendoAvatar && <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">...</div>}
              </div>
              <div>
                <label className="inline-block cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
                  {sesion.usuario.avatar_url ? 'Cambiar foto' : 'Subir foto'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subirAvatar(f) }} disabled={subiendoAvatar} />
                </label>
                <p className="text-[11px] text-slate-400 mt-1.5">JPG o PNG, máximo 3MB.</p>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nombre completo</label>
                <input type="text" value={formPerfil.nombre} onChange={(e) => setFormPerfil({ ...formPerfil, nombre: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#28363E]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Correo</label>
                <input type="text" value={sesion.usuario.email} disabled className="w-full p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Teléfono</label>
                <input type="text" value={formPerfil.telefono} onChange={(e) => setFormPerfil({ ...formPerfil, telefono: e.target.value })} placeholder="Ej. 55 1234 5678" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28363E]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Puesto</label>
                <input type="text" value={formPerfil.puesto} onChange={(e) => setFormPerfil({ ...formPerfil, puesto: e.target.value })} placeholder="Ej. Nutrióloga, Recepción" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28363E]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Cerrar mi sesión sola por inactividad</label>
                <p className="text-[11px] text-slate-400 mb-2">Útil en una computadora compartida, ej. recepción.</p>
                <div className="flex flex-wrap gap-2">
                  {[{ v: null, l: 'Nunca' }, { v: 5, l: '5 min' }, { v: 15, l: '15 min' }, { v: 30, l: '30 min' }].map(op => (
                    <button
                      key={op.l}
                      type="button"
                      onClick={() => setFormPerfil({ ...formPerfil, auto_logout_minutos: op.v })}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${formPerfil.auto_logout_minutos === op.v ? 'bg-[#28363E] border-[#28363E] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {op.l}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={guardarPerfil} disabled={guardandoPerfil} className="w-full py-3 bg-[#28363E] text-white rounded-xl text-sm font-black hover:bg-[#1C262C] transition-colors disabled:opacity-50">
                {guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cambiar Correo</p>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nuevo correo electrónico</label>
                <input type="email" value={nuevoCorreo} onChange={(e) => setNuevoCorreo(e.target.value)} placeholder="nuevo@correo.com" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28363E]" />
              </div>
              {avisoCorreo && (
                <div className="bg-slate-50 text-[#28363E] p-3 rounded-xl text-xs text-center border border-slate-200 font-medium">{avisoCorreo}</div>
              )}
              <button onClick={cambiarCorreo} disabled={cambiandoCorreo || !nuevoCorreo} className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-black hover:bg-slate-900 transition-colors disabled:opacity-50">
                {cambiandoCorreo ? 'Enviando...' : 'Cambiar Correo'}
              </button>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cambiar Contraseña</p>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nueva contraseña</label>
                <input type="password" value={formPassword.nueva} onChange={(e) => setFormPassword({ ...formPassword, nueva: e.target.value })} placeholder="••••••••" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28363E]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Confirma la nueva contraseña</label>
                <input type="password" value={formPassword.confirmar} onChange={(e) => setFormPassword({ ...formPassword, confirmar: e.target.value })} placeholder="••••••••" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28363E]" />
              </div>
              {errorPassword && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs text-center border border-rose-200 font-bold">{errorPassword}</div>
              )}
              <button onClick={cambiarPassword} disabled={cambiandoPassword || !formPassword.nueva} className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-black hover:bg-slate-900 transition-colors disabled:opacity-50">
                {cambiandoPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </div>
        )}

        {vista === 'accesos' && sesion?.esFullAccess && (
          <>
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
                    <div className="flex items-center gap-3.5 min-w-0">
                      {u.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={u.avatar_url} alt={u.nombre} className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-[#28363E] border border-slate-200 shrink-0">
                          {u.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 truncate">{u.nombre} {esUnoMismo && <span className="text-[10px] text-[#28363E] font-black ml-1">(TÚ)</span>}</p>
                        <p className="text-sm text-slate-500 truncate">{u.puesto ? `${u.puesto} · ` : ''}{u.email}</p>
                        <p className="text-[11px] text-slate-400 font-medium truncate">{formatearUltimoAcceso(ultimoAcceso[u.id])}</p>
                      </div>
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

            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-[#28363E]">
              <p className="font-bold mb-1">¿Cómo le doy acceso a alguien nuevo?</p>
              <p>Pídele que entre a la pantalla de inicio de sesión y toque "Personal nuevo, crea tu cuenta aquí". En cuanto se registre, aparecerá aquí arriba en "Pendientes de aprobación" para que le asignes su nivel de acceso.</p>
            </div>
          </>
        )}

        {vista === 'servicios' && sesion?.esFullAccess && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Catálogo de Servicios ({servicios.length})</h2>
              <button onClick={agregarServicio} className="bg-[#28363E] text-white text-xs font-black px-3.5 py-2 rounded-lg hover:bg-[#1C262C] transition-colors">+ Agregar</button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Estos son los servicios que aparecen al cobrar en el expediente del paciente. Cambia el nombre o precio y se guarda solo.</p>
            <div className="space-y-3">
              {servicios.map(s => (
                <div key={s.id} className={`bg-white border rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-sm ${s.activo ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
                  <span className="text-xl">{s.icono}</span>
                  <input
                    type="text"
                    defaultValue={s.nombre}
                    onBlur={(e) => e.target.value !== s.nombre && actualizarServicio(s.id, { nombre: e.target.value })}
                    className="flex-1 min-w-[140px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#28363E]"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      defaultValue={s.precio}
                      onBlur={(e) => Number(e.target.value) !== s.precio && actualizarServicio(s.id, { precio: Number(e.target.value) || 0 })}
                      className="w-24 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-[#28363E] text-center"
                    />
                  </div>
                  <button
                    onClick={() => actualizarServicio(s.id, { activo: !s.activo })}
                    className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors ${s.activo ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                  >
                    {s.activo ? 'Ocultar' : 'Reactivar'}
                  </button>
                  <button onClick={() => eliminarServicio(s.id)} className="text-rose-500 text-xs font-bold px-3 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors">Eliminar</button>
                </div>
              ))}
              {servicios.length === 0 && <p className="text-center text-sm text-slate-400 py-10">Sin servicios todavía.</p>}
            </div>
          </div>
        )}

        {vista === 'clinica' && sesion?.esFullAccess && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 max-w-lg">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Perfil de la Clínica</h2>
            <p className="text-xs text-slate-500 -mt-2">Esta información aparece en el portal del paciente y se usa como referencia en tickets.</p>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nombre de la Clínica</label>
              <input type="text" value={formClinica.nombre_clinica} onChange={(e) => setFormClinica({ ...formClinica, nombre_clinica: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#28363E]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Dirección</label>
              <input type="text" value={formClinica.direccion} onChange={(e) => setFormClinica({ ...formClinica, direccion: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28363E]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Teléfono de Contacto</label>
              <input type="text" value={formClinica.telefono_contacto} onChange={(e) => setFormClinica({ ...formClinica, telefono_contacto: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28363E]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Horario de Atención</label>
              <input type="text" value={formClinica.horario} onChange={(e) => setFormClinica({ ...formClinica, horario: e.target.value })} placeholder="Ej. Lunes a Viernes 9am - 6pm" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28363E]" />
            </div>
            <button onClick={guardarClinica} disabled={guardandoClinica} className="w-full py-3 bg-[#28363E] text-white rounded-xl text-sm font-black hover:bg-[#1C262C] transition-colors disabled:opacity-50">
              {guardandoClinica ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        )}

        {vista === 'actividad' && sesion?.esFullAccess && (
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Actividad Reciente</h2>
            {cargandoActividad ? (
              <p className="text-center text-sm text-slate-400 py-10 animate-pulse">Cargando...</p>
            ) : (
              <div className="space-y-2.5">
                {actividad.map(a => (
                  <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <span className="text-lg shrink-0">{a.icono}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{a.texto}</p>
                      <p className="text-[11px] text-slate-500">{a.quien} · {new Date(a.cuando).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                {actividad.length === 0 && <p className="text-center text-sm text-slate-400 py-10">Sin actividad registrada todavía.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
