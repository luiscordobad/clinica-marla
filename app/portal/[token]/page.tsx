"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { ETIQUETA_TIPO_CITA, type TipoCita } from '../../../lib/types'
import GraficaProgreso from '../../../components/GraficaProgreso'

type DatosPortal = {
  valido: boolean
  nombre?: string
  proxima_cita?: { fecha: string; hora: string; tipo: TipoCita } | null
  plan?: { fecha: string; tipo: string; enfoque_nutricional: Record<string, any> } | null
  progreso?: { fecha: string; peso: number | null; grasa: number | null }[]
  racha?: number
  clinica?: { nombre: string; direccion: string | null; telefono: string | null; horario: string | null }
}

const ETIQUETA_ENFOQUE_PORTAL: Record<string, string> = {
  'Deficit Calorico Ligero': 'Déficit Calórico Ligero',
  'Deficit Calorico Moderado': 'Déficit Calórico Moderado',
  'Deficit Calorico Estricto': 'Déficit Calórico Estricto',
  'Mantenimiento': 'Mantenimiento',
  'Superavit': 'Superávit',
}

export default function PortalPaciente({ params }: { params: { token: string } }) {
  const [cargando, setCargando] = useState(true)
  const [datos, setDatos] = useState<DatosPortal | null>(null)

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase.rpc('portal_paciente', { p_token: params.token })
      if (!error && data) setDatos(data as DatosPortal)
      setCargando(false)
    }
    cargar()
  }, [params.token])

  if (cargando) {
    return <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center"><p className="animate-pulse font-bold text-[#0066FF]">Cargando tu información...</p></div>
  }

  if (!datos?.valido) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-sm text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-black text-slate-800 mb-1">Link no válido</p>
          <p className="text-sm text-slate-500">Este enlace no existe o ya no está activo. Pide a la clínica que te comparta uno nuevo.</p>
        </div>
      </div>
    )
  }

  const enfoque = datos.plan?.enfoque_nutricional || {}
  const tieneEnfoque = Object.values(enfoque).some(v => v !== undefined && v !== null && String(v).trim() !== '')

  const pesosRegistrados = (datos.progreso || []).filter(p => p.peso !== null && p.peso !== undefined) as { fecha: string; peso: number }[]
  const deltaPeso = pesosRegistrados.length >= 2 ? pesosRegistrados[pesosRegistrados.length - 1].peso - pesosRegistrados[0].peso : null

  return (
    <main className="min-h-screen bg-[#F4F6F9] p-4 sm:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center pt-4 pb-2">
          <div className="w-14 h-14 bg-[#0066FF] rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-3 shadow-sm">M</div>
          <h1 className="text-xl font-black text-slate-800">Hola, {datos.nombre?.split(' ')[0]} 🌿</h1>
          <p className="text-sm text-slate-500 mt-1">Este es tu resumen personal de Clínica Marla</p>
        </div>

        {(deltaPeso !== null || (datos.racha || 0) > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {deltaPeso !== null && (
              <div className={`rounded-3xl p-6 text-white shadow-sm ${deltaPeso < 0 ? 'bg-gradient-to-br from-[#0066FF] to-cyan-500' : deltaPeso > 0 ? 'bg-gradient-to-br from-teal-500 to-emerald-500' : 'bg-slate-700'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Desde tu primera consulta</p>
                <p className="text-3xl font-black">{deltaPeso > 0 ? '+' : ''}{deltaPeso.toFixed(1)} kg</p>
              </div>
            )}
            {(datos.racha || 0) > 0 && (
              <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Racha de asistencia</p>
                <p className="text-3xl font-black">🔥 {datos.racha} {datos.racha === 1 ? 'consulta' : 'consultas'}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">📅 Tu Próxima Cita</h2>
          {datos.proxima_cita ? (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <p className="text-lg font-black text-slate-800">
                {new Date(datos.proxima_cita.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-[#0066FF] font-black text-2xl mt-1">{datos.proxima_cita.hora.substring(0, 5)} hrs</p>
              <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-wide">{ETIQUETA_TIPO_CITA[datos.proxima_cita.tipo]}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 font-medium">No tienes ninguna cita programada por ahora.</p>
          )}
        </div>

        {tieneEnfoque && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">🎯 Tu Plan Nutricional</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {enfoque.enfoque && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Enfoque</p>
                  <p className="text-sm font-black text-slate-800">{ETIQUETA_ENFOQUE_PORTAL[enfoque.enfoque] || enfoque.enfoque}</p>
                </div>
              )}
              {enfoque.aporte_calorico && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Kcal Objetivo</p>
                  <p className="text-lg font-black text-[#0066FF]">{enfoque.aporte_calorico} kcal</p>
                </div>
              )}
              {enfoque.tiempos_comida && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Tiempos de comida</p>
                  <p className="text-lg font-black text-slate-800">{enfoque.tiempos_comida}</p>
                </div>
              )}
            </div>
            {(enfoque.pct_carbohidratos || enfoque.pct_proteinas || enfoque.pct_grasas) && (
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                <div className="text-center"><p className="text-[9px] font-bold text-slate-400 uppercase">Carbs</p><p className="font-black text-slate-800">{enfoque.pct_carbohidratos || 0}%</p></div>
                <div className="text-center"><p className="text-[9px] font-bold text-slate-400 uppercase">Proteína</p><p className="font-black text-slate-800">{enfoque.pct_proteinas || 0}%</p></div>
                <div className="text-center"><p className="text-[9px] font-bold text-slate-400 uppercase">Grasas</p><p className="font-black text-slate-800">{enfoque.pct_grasas || 0}%</p></div>
              </div>
            )}
            {enfoque.notas_suplementos_recetados && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Suplementación indicada</p>
                <p className="text-sm text-slate-700">{enfoque.notas_suplementos_recetados}</p>
              </div>
            )}
          </div>
        )}

        {datos.progreso && datos.progreso.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">📈 Tu Progreso</h2>
            <GraficaProgreso puntos={datos.progreso} />
          </div>
        )}

        {datos.clinica && (datos.clinica.direccion || datos.clinica.telefono || datos.clinica.horario) && (
          <div className="text-center text-xs text-slate-500 space-y-0.5 pt-2">
            <p className="font-black text-slate-700">{datos.clinica.nombre}</p>
            {datos.clinica.direccion && <p>{datos.clinica.direccion}</p>}
            {datos.clinica.telefono && <p>📞 {datos.clinica.telefono}</p>}
            {datos.clinica.horario && <p>🕐 {datos.clinica.horario}</p>}
          </div>
        )}

        <p className="text-[11px] text-center text-slate-400 pb-6">Este link es personal — no lo compartas. Para cualquier duda, contacta directo a Clínica Marla.</p>
      </div>
    </main>
  )
}
