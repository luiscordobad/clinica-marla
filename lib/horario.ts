// Horario de atención de la clínica por día de la semana.
// Clave "0".."6" como Date.getDay() (0 = domingo). null = cerrado ese día.
// Si la clínica no lo ha configurado (HorarioAtencion null) no se restringe nada.
export type DiaHorario = { abre: string; cierra: string } | null
export type HorarioAtencion = Record<string, DiaHorario>

export const DIAS_SEMANA = [
  { clave: '1', nombre: 'Lunes' }, { clave: '2', nombre: 'Martes' }, { clave: '3', nombre: 'Miércoles' },
  { clave: '4', nombre: 'Jueves' }, { clave: '5', nombre: 'Viernes' }, { clave: '6', nombre: 'Sábado' }, { clave: '0', nombre: 'Domingo' },
]

export const HORARIO_SUGERIDO: HorarioAtencion = {
  '1': { abre: '09:00', cierra: '19:00' }, '2': { abre: '09:00', cierra: '19:00' }, '3': { abre: '09:00', cierra: '19:00' },
  '4': { abre: '09:00', cierra: '19:00' }, '5': { abre: '09:00', cierra: '19:00' }, '6': { abre: '09:00', cierra: '14:00' }, '0': null,
}

const aMinutos = (hhmm: string) => parseInt(hhmm.substring(0, 2), 10) * 60 + (parseInt(hhmm.substring(3, 5), 10) || 0)

export function horarioDelDia(h: HorarioAtencion | null, fecha: string): DiaHorario | undefined {
  if (!h || !fecha) return undefined
  return h[String(new Date(fecha + 'T12:00:00').getDay())] ?? null
}

export function diaCerrado(h: HorarioAtencion | null, fecha: string): boolean {
  return horarioDelDia(h, fecha) === null
}

// ¿La cita (hora + duración) cae fuera del horario de ese día?
export function fueraDeHorario(h: HorarioAtencion | null, fecha: string, hora: string, duracionMin = 0): boolean {
  const dia = horarioDelDia(h, fecha)
  if (dia === undefined) return false
  if (dia === null) return true
  const inicio = aMinutos(hora)
  return inicio < aMinutos(dia.abre) || inicio + duracionMin > aMinutos(dia.cierra)
}

// ¿Toda la franja de esa hora (ej. "08:00" = 8:00–9:00) queda fuera del horario?
export function horaCerrada(h: HorarioAtencion | null, fecha: string, hora: string): boolean {
  const dia = horarioDelDia(h, fecha)
  if (dia === undefined) return false
  if (dia === null) return true
  const inicio = aMinutos(hora)
  return inicio + 60 <= aMinutos(dia.abre) || inicio >= aMinutos(dia.cierra)
}

// Horas que muestra la agenda: del primer horario de apertura al último cierre,
// ampliado si hay citas fuera de ese rango (para que nunca se oculte una cita).
export function horasDeAgenda(h: HorarioAtencion | null, horasConCitas: number[]): string[] {
  let desde = 7, hasta = 21
  const dias = h ? Object.values(h).filter(Boolean) as { abre: string; cierra: string }[] : []
  if (dias.length > 0) {
    desde = Math.min(...dias.map(d => Math.floor(aMinutos(d.abre) / 60)))
    hasta = Math.max(...dias.map(d => Math.ceil(aMinutos(d.cierra) / 60))) - 1
  }
  for (const hc of horasConCitas) { desde = Math.min(desde, hc); hasta = Math.max(hasta, hc) }
  desde = Math.max(0, desde); hasta = Math.min(23, Math.max(hasta, desde))
  return Array.from({ length: hasta - desde + 1 }, (_, i) => `${String(desde + i).padStart(2, '0')}:00`)
}

export function textoHorarioDia(d: DiaHorario | undefined): string {
  return d ? `${d.abre} a ${d.cierra}` : 'cerrado'
}
