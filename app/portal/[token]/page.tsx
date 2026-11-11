"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { ETIQUETA_TIPO_CITA, type TipoCita } from '../../../lib/types'
import GraficaProgreso from '../../../components/GraficaProgreso'

type DatosPortal = {
  valido: boolean
  nombre?: string
  proxima_cita?: { id: string; fecha: string; hora: string; tipo: TipoCita; duracion_min?: number; confirmada?: boolean; cambio_solicitado?: boolean } | null
  plan?: { fecha: string; tipo: string; enfoque_nutricional: Record<string, any>; inbody?: Record<string, any> | null } | null
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
  const [enviando, setEnviando] = useState(false)
  const [pidiendoCambio, setPidiendoCambio] = useState(false)
  const [mensajeCambio, setMensajeCambio] = useState('')
  const [errorCita, setErrorCita] = useState('')

  const cargar = async () => {
    const { data, error } = await supabase.rpc('portal_paciente', { p_token: params.token })
    if (!error && data) setDatos(data as DatosPortal)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [params.token]) // eslint-disable-line react-hooks/exhaustive-deps

  const responderCita = async (accion: 'confirmar' | 'cambio') => {
    if (!datos?.proxima_cita) return
    setEnviando(true); setErrorCita('')
    const { data, error } = await supabase.rpc('portal_responder_cita', { p_token: params.token, p_cita_id: datos.proxima_cita.id, p_accion: accion, p_mensaje: accion === 'cambio' ? mensajeCambio : null })
    if (error || !(data as any)?.ok) setErrorCita('No pudimos registrar tu respuesta. Intenta de nuevo o contacta a la clínica.')
    else { setPidiendoCambio(false); setMensajeCambio('') }
    await cargar()
    setEnviando(false)
  }

  if (cargando) {
    return <div className="min-h-screen bg-[#F4F6F9] dark:bg-slate-950 flex items-center justify-center"><p className="animate-pulse font-bold text-[#28363E] dark:text-slate-300">Cargando tu información...</p></div>
  }

  if (!datos?.valido) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 max-w-sm text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-black text-slate-800 dark:text-slate-100 mb-1">Link no válido</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Este enlace no existe o ya no está activo. Pide a la clínica que te comparta uno nuevo.</p>
        </div>
      </div>
    )
  }

  const enfoque = datos.plan?.enfoque_nutricional || {}
  const tieneEnfoque = Object.values(enfoque).some(v => v !== undefined && v !== null && String(v).trim() !== '')

  const kcal = parseFloat(enfoque.aporte_calorico) || 0
  const gramos = (pct: any, kcalPorGramo: number) => { const n = parseFloat(pct) || 0; return kcal > 0 && n > 0 ? Math.round((kcal * n / 100) / kcalPorGramo) : null }
  const macros = [
    { nombre: 'Carbohidratos', pct: enfoque.pct_carbohidratos, g: gramos(enfoque.pct_carbohidratos, 4), color: 'bg-amber-400' },
    { nombre: 'Proteína', pct: enfoque.pct_proteinas, g: gramos(enfoque.pct_proteinas, 4), color: 'bg-teal-500' },
    { nombre: 'Grasas', pct: enfoque.pct_grasas, g: gramos(enfoque.pct_grasas, 9), color: 'bg-rose-400' },
  ]
  const inbody = datos.plan?.inbody || {}
  const composicion = [
    { l: 'Peso', v: inbody.peso_kg, u: 'kg' }, { l: 'Grasa corporal', v: inbody.grasa_pct, u: '%' },
    { l: 'Músculo', v: inbody.musculo_esqu_kg, u: 'kg' }, { l: 'Masa grasa', v: inbody.masa_grasa_kg, u: 'kg' },
    { l: 'Agua corporal', v: inbody.agua_total_lt, u: 'L' }, { l: 'Metabolismo basal', v: inbody.tmb_kcal, u: 'kcal' },
  ].filter(c => c.v !== undefined && c.v !== null && String(c.v).trim() !== '')
  const metas = [
    { l: 'Peso ideal', v: inbody.peso_ideal_kg, u: 'kg' }, { l: 'Grasa a bajar', v: inbody.grasa_bajar_kg, u: 'kg' },
    { l: 'Grasa a subir', v: inbody.grasa_subir_kg, u: 'kg' }, { l: 'Músculo a subir', v: inbody.musculo_subir_kg, u: 'kg' },
  ].filter(c => c.v !== undefined && c.v !== null && String(c.v).trim() !== '' && parseFloat(c.v) !== 0)
  const ETIQUETA_PEPTIDO: Record<string, string> = { pep_semaglutida: 'Semaglutida', pep_tirzepatida: 'Tirzepatida', pep_retatrutide: 'Retatrutide', pep_bpc157: 'BPC-157', pep_tb500: 'TB-500', pep_epitalon: 'Epitalon', pep_humanin: 'Humanin', pep_ghk_cu: 'GHK-Cu', pep_nad: 'NAD+' }
  const tratamiento = Object.entries(ETIQUETA_PEPTIDO).map(([k, nombre]) => {
    const v = enfoque[k]
    if (v === undefined || v === null || String(v).trim() === '' || v === 'No') return null
    return v === 'Si' ? nombre : `${nombre}: ${v}`
  }).filter(Boolean) as string[]
  const fechaPlan = datos.plan?.fecha ? new Date(datos.plan.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const tienePlan = tieneEnfoque || composicion.length > 0

  const pesosRegistrados = (datos.progreso || []).filter(p => p.peso !== null && p.peso !== undefined) as { fecha: string; peso: number }[]
  const deltaPeso = pesosRegistrados.length >= 2 ? pesosRegistrados[pesosRegistrados.length - 1].peso - pesosRegistrados[0].peso : null

  return (
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-slate-950 p-4 sm:p-8 portal-imprimible">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center pt-4 pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-marla-firma.png" alt="Marla Polo" className="h-12 w-auto mx-auto mb-3 dark:brightness-0 dark:invert" />
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Hola, {datos.nombre?.split(' ')[0]} 🌿</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Este es tu resumen personal de Clínica Marla</p>
        </div>

        {(deltaPeso !== null || (datos.racha || 0) > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {deltaPeso !== null && (
              <div className={`rounded-3xl p-6 text-white shadow-sm ${deltaPeso < 0 ? 'bg-gradient-to-br from-[#28363E] to-cyan-500' : deltaPeso > 0 ? 'bg-gradient-to-br from-teal-500 to-emerald-500' : 'bg-slate-700'}`}>
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

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">📅 Tu Próxima Cita</h2>
          {datos.proxima_cita ? (
            <>
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                <p className="text-lg font-black text-slate-800 dark:text-slate-100 capitalize">
                  {new Date(datos.proxima_cita.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-[#28363E] dark:text-slate-300 font-black text-2xl mt-1">{datos.proxima_cita.hora.substring(0, 5)} hrs</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-wide">{ETIQUETA_TIPO_CITA[datos.proxima_cita.tipo]}</p>
              </div>

              <div className="no-imprimir mt-4">
                {datos.proxima_cita.confirmada && (
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 mb-3">✅ Asistencia confirmada. ¡Te esperamos!</p>
                )}
                {datos.proxima_cita.cambio_solicitado && (
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-3">🔁 Recibimos tu solicitud de cambio. La clínica te contactará para reagendar; mientras tanto tu cita sigue en esta fecha.</p>
                )}
                {errorCita && <p className="text-xs font-bold text-rose-600 mb-3">{errorCita}</p>}

                {pidiendoCambio ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">¿Qué día u horario te acomoda mejor? (opcional)</label>
                    <textarea value={mensajeCambio} onChange={(e) => setMensajeCambio(e.target.value)} maxLength={300} rows={3} placeholder="Ej. Puedo el jueves por la tarde" className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-[#28363E]" />
                    <div className="flex gap-2">
                      <button onClick={() => { setPidiendoCambio(false); setMensajeCambio('') }} className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold">Cancelar</button>
                      <button onClick={() => responderCita('cambio')} disabled={enviando} className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-sm font-black disabled:opacity-50">{enviando ? 'Enviando...' : 'Enviar solicitud'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {!datos.proxima_cita.confirmada && (
                      <button onClick={() => responderCita('confirmar')} disabled={enviando} className="flex-1 py-3.5 bg-[#28363E] dark:bg-[#4A6472] text-white rounded-xl text-sm font-black disabled:opacity-50">{enviando ? 'Enviando...' : '✓ Confirmo que asistiré'}</button>
                    )}
                    {!datos.proxima_cita.cambio_solicitado && (
                      <button onClick={() => setPidiendoCambio(true)} disabled={enviando} className={`py-3.5 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold ${datos.proxima_cita.confirmada ? 'flex-1' : ''}`}>Necesito cambiarla</button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">No tienes ninguna cita programada por ahora.</p>
          )}
        </div>

        {tienePlan && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">🎯 Tu Plan Nutricional</h2>
                {fechaPlan && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Actualizado en tu consulta del {fechaPlan}</p>}
              </div>
              <button onClick={() => window.print()} className="no-imprimir shrink-0 text-xs font-black text-[#28363E] dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">📄 Descargar PDF</button>
            </div>

            {tieneEnfoque && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {enfoque.enfoque && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Enfoque</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{ETIQUETA_ENFOQUE_PORTAL[enfoque.enfoque] || enfoque.enfoque}</p>
                    </div>
                  )}
                  {enfoque.aporte_calorico && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Calorías al día</p>
                      <p className="text-lg font-black text-[#28363E] dark:text-slate-300">{enfoque.aporte_calorico} kcal</p>
                    </div>
                  )}
                  {enfoque.tiempos_comida && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tiempos de comida</p>
                      <p className="text-lg font-black text-slate-800 dark:text-slate-100">{enfoque.tiempos_comida}</p>
                    </div>
                  )}
                </div>

                {(enfoque.pct_carbohidratos || enfoque.pct_proteinas || enfoque.pct_grasas) && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-3">Distribución diaria</p>
                    <div className="flex h-2.5 rounded-full overflow-hidden mb-3 bg-slate-200 dark:bg-slate-700">
                      {macros.map(m => <div key={m.nombre} className={m.color} style={{ width: `${parseFloat(m.pct) || 0}%` }}></div>)}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {macros.map(m => (
                        <div key={m.nombre} className="text-center">
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center justify-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${m.color}`}></span>{m.nombre}</p>
                          <p className="font-black text-slate-800 dark:text-slate-100">{m.pct || 0}%</p>
                          {m.g !== null && <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{m.g} g</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {enfoque.notas_suplementos_recetados && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Suplementación indicada</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{enfoque.notas_suplementos_recetados}</p>
                  </div>
                )}

                {tratamiento.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Tratamiento indicado</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tratamiento.map(t => <span key={t} className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">{t}</span>)}
                    </div>
                  </div>
                )}
              </>
            )}

            {composicion.length > 0 && (
              <div className={tieneEnfoque ? 'pt-4 border-t border-slate-100 dark:border-slate-800' : ''}>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-3">Tu composición corporal</p>
                <div className="grid grid-cols-3 gap-2">
                  {composicion.map(c => (
                    <div key={c.l} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-tight">{c.l}</p>
                      <p className="font-black text-slate-800 dark:text-slate-100 mt-0.5">{c.v}<span className="text-[10px] font-bold text-slate-400 ml-0.5">{c.u}</span></p>
                    </div>
                  ))}
                </div>
                {metas.length > 0 && (
                  <div className="mt-3 bg-[#28363E]/5 dark:bg-slate-800/60 border border-[#28363E]/10 dark:border-slate-700 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tus metas</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {metas.map(m => <p key={m.l} className="text-sm text-slate-700 dark:text-slate-200"><span className="font-medium">{m.l}:</span> <span className="font-black">{m.v} {m.u}</span></p>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {datos.progreso && datos.progreso.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">📈 Tu Progreso</h2>
            <GraficaProgreso puntos={datos.progreso} />
          </div>
        )}

        {datos.clinica && (datos.clinica.direccion || datos.clinica.telefono || datos.clinica.horario) && (
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 space-y-0.5 pt-2">
            <p className="font-black text-slate-700 dark:text-slate-200">{datos.clinica.nombre}</p>
            {datos.clinica.direccion && <p>{datos.clinica.direccion}</p>}
            {datos.clinica.telefono && <p>📞 {datos.clinica.telefono}</p>}
            {datos.clinica.horario && <p>🕐 {datos.clinica.horario}</p>}
          </div>
        )}

        <p className="no-imprimir text-[11px] text-center text-slate-400 dark:text-slate-500 pb-6">Este link es personal — no lo compartas. Para cualquier duda, contacta directo a Clínica Marla.</p>
      </div>
    </main>
  )
}
