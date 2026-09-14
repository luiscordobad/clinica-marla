"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { obtenerEstadoSesion } from '../../lib/auth'

const FORM_VACIO = {
  nombre_completo: '', fecha_nacimiento: '', genero: '', origen: '',
  residencia: '', correo: '', telefono: '', escolaridad: '', profesion: ''
}

type PacienteLigero = { id: string; nombre_completo: string; telefono: string | null }

export default function RegistroPaciente() {
  const [verificando, setVerificando] = useState(true)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [pacientesExistentes, setPacientesExistentes] = useState<PacienteLigero[]>([])
  const [formData, setFormData] = useState(FORM_VACIO)
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string; pacienteId?: string } | null>(null)
  const [posiblesDuplicados, setPosiblesDuplicados] = useState<PacienteLigero[]>([])
  const [confirmadoDuplicado, setConfirmadoDuplicado] = useState(false)
  const [referidoTexto, setReferidoTexto] = useState('')
  const [referidoId, setReferidoId] = useState<string | null>(null)

  useEffect(() => {
    const verificar = async () => {
      const estado = await obtenerEstadoSesion()
      if (estado.tipo !== 'activa') { window.location.href = '/login'; return }
      setUsuarioId(estado.sesion.usuario.id)
      const { data } = await supabase.from('pacientes').select('id, nombre_completo, telefono').eq('activo', true)
      if (data) setPacientesExistentes(data)
      setVerificando(false)
    }
    verificar()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setPosiblesDuplicados([])
    setConfirmadoDuplicado(false)
  }

  const buscarDuplicados = (): PacienteLigero[] => {
    const telDigitos = formData.telefono.replace(/\D/g, '')
    const nombreNormalizado = formData.nombre_completo.trim().toLowerCase()
    return pacientesExistentes.filter(p => {
      const coincidePorTelefono = telDigitos.length >= 8 && (p.telefono || '').replace(/\D/g, '') === telDigitos
      const coincidePorNombre = nombreNormalizado.length > 0 && p.nombre_completo.trim().toLowerCase() === nombreNormalizado
      return coincidePorTelefono || coincidePorNombre
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!confirmadoDuplicado) {
      const duplicados = buscarDuplicados()
      if (duplicados.length > 0) { setPosiblesDuplicados(duplicados); return }
    }

    setLoading(true)
    setMensaje(null)

    const { data, error } = await supabase
      .from('pacientes')
      .insert([{ ...formData, created_by: usuarioId, referido_por_paciente_id: referidoId }])
      .select('id')
      .single()

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Paciente registrado con éxito!', pacienteId: data.id })
      setFormData(FORM_VACIO)
      setPosiblesDuplicados([])
      setConfirmadoDuplicado(false)
      setReferidoTexto('')
      setReferidoId(null)
      setPacientesExistentes([...pacientesExistentes, { id: data.id, nombre_completo: formData.nombre_completo, telefono: formData.telefono }])
    }
    setLoading(false)
  }

  if (verificando) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><p className="animate-pulse font-bold text-[#0066FF]">Cargando...</p></div>

  return (
    <main className="min-h-screen bg-[#F4F6F9] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-8 border border-slate-100">

        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Registro de Nuevo Paciente</h1>
            <p className="text-sm text-slate-500 mt-1">Datos básicos de contacto. El expediente clínico se llena en su primera consulta.</p>
          </div>
          <Link href="/" className="text-[#0066FF] hover:underline text-sm font-bold whitespace-nowrap ml-4">
            ← Volver
          </Link>
        </div>

        {mensaje && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center justify-between gap-3 ${mensaje.tipo === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
            <span>{mensaje.texto}</span>
            {mensaje.pacienteId && (
              <Link href={`/paciente/${mensaje.pacienteId}`} className="bg-[#0066FF] text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap hover:bg-blue-700 transition-colors">
                Ir al Expediente →
              </Link>
            )}
          </div>
        )}

        {posiblesDuplicados.length > 0 && (
          <div className="p-5 rounded-2xl mb-6 bg-amber-50 border border-amber-200">
            <p className="text-sm font-black text-amber-800 mb-1">⚠️ Ya existe un paciente parecido</p>
            <p className="text-xs text-amber-700 mb-3">Revisa si es la misma persona antes de crear un registro duplicado:</p>
            <div className="space-y-2 mb-4">
              {posiblesDuplicados.map(p => (
                <Link key={p.id} href={`/paciente/${p.id}`} className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-amber-100 hover:border-amber-300 transition-colors">
                  <span className="text-sm font-bold text-slate-700">{p.nombre_completo}</span>
                  <span className="text-xs text-slate-400">📞 {p.telefono || 'sin teléfono'} — Ver expediente →</span>
                </Link>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPosiblesDuplicados([])} className="px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100">Cancelar</button>
              <button type="button" onClick={() => { setConfirmadoDuplicado(true); setPosiblesDuplicados([]) }} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">Es una persona distinta, registrar de todas formas</button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Nombre Completo</label>
                <input required type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Fecha de Nacimiento</label>
                <input required type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Género</label>
                <select required name="genero" value={formData.genero} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none">
                  <option value="">Selecciona...</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Teléfono</label>
                <input required type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Correo Electrónico</label>
                <input type="email" name="correo" value={formData.correo} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Origen (Ciudad/Estado)</label>
                <input type="text" name="origen" value={formData.origen} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Residencia Actual</label>
                <input type="text" name="residencia" value={formData.residencia} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Escolaridad</label>
                <input type="text" name="escolaridad" value={formData.escolaridad} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Ocupación / Profesión</label>
                <input type="text" name="profesion" value={formData.profesion} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none" />
              </div>
              <div className="relative">
                <label className="block text-sm font-bold text-slate-600 mb-1">¿Quién lo refirió? (opcional)</label>
                <input
                  type="text"
                  value={referidoTexto}
                  onChange={(e) => { setReferidoTexto(e.target.value); setReferidoId(null) }}
                  placeholder="Busca por nombre..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] outline-none"
                />
                {referidoTexto.trim().length > 1 && !referidoId && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {pacientesExistentes.filter(p => p.nombre_completo.toLowerCase().includes(referidoTexto.trim().toLowerCase())).slice(0, 6).map(p => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => { setReferidoId(p.id); setReferidoTexto(p.nombre_completo) }}
                        className="w-full text-left px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 transition-colors"
                      >
                        {p.nombre_completo}
                      </button>
                    ))}
                    {pacientesExistentes.filter(p => p.nombre_completo.toLowerCase().includes(referidoTexto.trim().toLowerCase())).length === 0 && (
                      <p className="px-3.5 py-2.5 text-xs text-slate-400">Sin coincidencias — déjalo así si no es un paciente existente.</p>
                    )}
                  </div>
                )}
                {referidoId && <p className="text-[11px] font-bold text-emerald-600 mt-1">✓ Referido por paciente existente</p>}
              </div>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-100">
            <button type="submit" disabled={loading} className="w-full bg-[#0066FF] text-white font-black py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
              {loading ? 'Guardando Paciente...' : 'Registrar Paciente'}
            </button>
          </div>
        </form>

      </div>
    </main>
  )
}
