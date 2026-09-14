import { ETIQUETA_TIPO_CITA, type TipoCita } from './types'

type EventoCalendario = {
  id: string
  nombre_paciente: string | null
  fecha_cita: string // YYYY-MM-DD
  hora_cita: string // HH:MM:SS
  duracion_min: number
  tipo: TipoCita
  estado: string
  notas: string | null
}

// Clínica Marla opera en horario central de México, que desde 2022 ya no
// cambia por horario de verano (UTC-6 todo el año). Si algún día la clínica
// se mueve a otro huso horario, este offset es lo único que hay que tocar.
const OFFSET_HORAS_MX = 6

function aFechaUTC(fecha: string, hora: string, offsetHoras = 0): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [h, m] = hora.split(':').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia, h + OFFSET_HORAS_MX, m + offsetHoras))
}

function formatearICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escaparTexto(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function construirICS(eventos: EventoCalendario[]): string {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clinica Marla//Agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Clínica Marla',
    'X-WR-TIMEZONE:America/Mexico_City',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  for (const ev of eventos) {
    const inicio = aFechaUTC(ev.fecha_cita, ev.hora_cita)
    const fin = new Date(inicio.getTime() + ev.duracion_min * 60000)
    const titulo = ev.tipo === 'bloqueo' ? 'Bloqueado' : `${ev.nombre_paciente || 'Paciente'} — ${ETIQUETA_TIPO_CITA[ev.tipo]}`
    const estadoIcs = ev.estado === 'completada' ? 'CONFIRMED' : ev.estado === 'en_espera' ? 'CONFIRMED' : 'TENTATIVE'

    lineas.push(
      'BEGIN:VEVENT',
      `UID:cita-${ev.id}@clinica-marla`,
      `DTSTAMP:${formatearICSDate(new Date())}`,
      `DTSTART:${formatearICSDate(inicio)}`,
      `DTEND:${formatearICSDate(fin)}`,
      `SUMMARY:${escaparTexto(titulo)}`,
      `STATUS:${estadoIcs}`,
      ...(ev.notas ? [`DESCRIPTION:${escaparTexto(ev.notas)}`] : []),
      'END:VEVENT',
    )
  }

  lineas.push('END:VCALENDAR')
  return lineas.join('\r\n')
}
