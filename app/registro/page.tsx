"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { obtenerEstadoSesion } from '../../lib/auth'

const FORM_VACIO = {
  nombre_completo: '', fecha_nacimiento: '', genero: '', origen: '',
  residencia: '', correo: '', telefono: '', escolaridad: '', profesion: ''
}

export default function RegistroPaciente() {
  const [verificando, setVerificando] = useState(true)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [formData, setFormData] = useState(FORM_VACIO)
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string; pacienteId?: string } | null>(null)

  useEffect(() => {
    const verificar = async () => {
      const estado = await obtenerEstadoSesion()
      if (estado.tipo !== 'activa') { window.location.href = '/login'; return }
      setUsuarioId(estado.sesion.usuario.id)
      setVerificando(false)
    }
    verificar()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMensaje(null)

    const { data, error } = await supabase
      .from('pacientes')
      .insert([{ ...formData, created_by: usuarioId }])
      .select('id')
      .single()

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Paciente registrado con éxito!', pacienteId: data.id })
      setFormData(FORM_VACIO)
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
