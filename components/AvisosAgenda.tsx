"use client"

import { useEffect, useMemo, useState } from 'react'
import type { Cita } from '../lib/types'
import { diasEntre, proximosFeriados } from '../lib/feriados'

export type RangoBloqueo = { inicio: string; fin: string; motivo: string; ids: string[] }

const activa = (c: Cita) => c.estado !== 'cancelada' && c.estado !== 'ausente'

// Agrupa los bloqueos de días consecutivos con el mismo motivo ("Vacaciones del 20 al 27").
export function agruparBloqueos(citas: Cita[], desde: string): RangoBloqueo[] {
  const bloqueos = citas.filter(c => c.tipo === 'bloqueo' && activa(c) && c.fecha_cita >= desde).sort((a, b) => a.fecha_cita.localeCompare(b.fecha_cita))
  const rangos: RangoBloqueo[] = []
  for (const b of bloqueos) {
    const motivo = b.nombre_paciente || 'Bloqueo'
    const ultimo = rangos[rangos.length - 1]
    if (ultimo && ultimo.motivo === motivo && diasEntre(ultimo.fin, b.fecha_cita) <= 1) { ultimo.fin = b.fecha_cita; ultimo.ids.push(b.id) }
    else rangos.push({ inicio: b.fecha_cita, fin: b.fecha_cita, motivo, ids: [b.id] })
  }
  return rangos
}

const fechaCorta = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/^./, c => c.toUpperCase())
export const textoRango = (r: RangoBloqueo) => r.inicio === r.fin ? fechaCorta(r.inicio) : `${fechaCorta(r.inicio)} al ${fechaCorta(r.fin)}`
const enCuanto = (n: number) => n <= 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`

const CLAVE = 'feriados_ignorados'

// Recordatorios de la agenda: feriados de México que vienen y vacaciones/bloqueos próximos.
export default function AvisosAgenda({ citas, hoy, onBloquear, onIrAFecha, onGestionar }: {
  citas: Cita[]
  hoy: string
  onBloquear: (fecha: string, motivo: string) => void
  onIrAFecha: (fecha: string) => void
  onGestionar: () => void
}) {
  const [ignorados, setIgnorados] = useState<string[]>([])
  useEffect(() => { try { setIgnorados(JSON.parse(localStorage.getItem(CLAVE) || '[]')) } catch (e) {} }, [])
  const ignorar = (fecha: string) => {
    const nuevos = [...ignorados.filter(f => f >= hoy), fecha]
    setIgnorados(nuevos)
    try { localStorage.setItem(CLAVE, JSON.stringify(nuevos)) } catch (e) {}
  }

  const citasEn = (inicio: string, fin: string) => citas.filter(c => c.tipo !== 'bloqueo' && activa(c) && c.fecha_cita >= inicio && c.fecha_cita <= fin).length

  const feriados = useMemo(() => {
    const bloqueados = new Set(citas.filter(c => c.tipo === 'bloqueo' && activa(c)).map(c => c.fecha_cita))
    return proximosFeriados(hoy, 45).filter(f => !bloqueados.has(f.fecha) && !ignorados.includes(f.fecha) && new Date(f.fecha + 'T12:00:00').getDay() !== 0)
  }, [citas, hoy, ignorados])

  const vacaciones = useMemo(() => agruparBloqueos(citas, hoy).filter(r => diasEntre(hoy, r.inicio) <= 21), [citas, hoy])

  const [verTodos, setVerTodos] = useState(false)
  if (feriados.length === 0 && vacaciones.length === 0) return null

  // Una sola lista por fecha; por defecto solo los 2 más cercanos para no tapar el flujo del día.
  const avisos = [
    ...feriados.map(f => ({ fecha: f.fecha, feriado: f, rango: null as RangoBloqueo | null })),
    ...vacaciones.map(r => ({ fecha: r.inicio, feriado: null, rango: r as RangoBloqueo | null })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const visibles = verTodos ? avisos : avisos.slice(0, 2)

  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
        Recordatorios
        <button onClick={onGestionar} className="normal-case tracking-normal text-[10px] font-bold text-[#28363E] dark:text-slate-300 hover:underline">Ver bloqueos</button>
      </h3>

      {visibles.map(a => {
        if (a.feriado) {
          const f = a.feriado
          const n = citasEn(f.fecha, f.fecha)
          return (
            <div key={'f' + f.fecha} className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-3">
              <button onClick={() => onIrAFecha(f.fecha)} className="w-full text-left">
                <p className="text-[13px] font-black text-slate-800 dark:text-slate-100 leading-tight">🇲🇽 {f.nombre}</p>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  {fechaCorta(f.fecha)} · {enCuanto(diasEntre(hoy, f.fecha))} · {f.oficial ? 'feriado oficial' : 'no oficial'}
                </p>
                {n > 0 && <p className="text-[11px] font-black text-rose-600 dark:text-rose-300 mt-1">⚠️ {n} cita{n === 1 ? '' : 's'} agendada{n === 1 ? '' : 's'} ese día</p>}
              </button>
              <div className="flex gap-2 mt-2">
                <button onClick={() => onBloquear(f.fecha, f.nombre)} className="flex-1 py-1.5 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-black hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors">Bloquear día</button>
                <button onClick={() => ignorar(f.fecha)} className="flex-1 py-1.5 text-slate-500 dark:text-slate-400 rounded-lg text-[11px] font-bold hover:bg-white/70 dark:hover:bg-slate-800 transition-colors">Sí trabajo</button>
              </div>
            </div>
          )
        }
        const r = a.rango!
        const n = citasEn(r.inicio, r.fin)
        const falta = diasEntre(hoy, r.inicio)
        return (
          <button key={'v' + r.ids[0]} onClick={() => onIrAFecha(r.inicio < hoy ? hoy : r.inicio)} className="w-full text-left bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3">
            <p className="text-[13px] font-black text-slate-800 dark:text-slate-100 leading-tight">🏖️ {r.motivo}</p>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{textoRango(r)} · {falta <= 0 ? 'en curso' : `empieza ${enCuanto(falta)}`}</p>
            {n > 0 && <p className="text-[11px] font-black text-amber-700 dark:text-amber-300 mt-1">⚠️ {n} cita{n === 1 ? '' : 's'} por reagendar en esas fechas</p>}
          </button>
        )
      })}

      {avisos.length > 2 && (
        <button onClick={() => setVerTodos(!verTodos)} className="w-full py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          {verTodos ? 'Ver menos' : `Ver ${avisos.length - 2} más`}
        </button>
      )}
    </div>
  )
}
