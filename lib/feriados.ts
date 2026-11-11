// Días feriados de México. "oficial" = descanso obligatorio según el art. 74 de
// la Ley Federal del Trabajo; el resto son fechas en las que muchas clínicas
// cierran o bajan la demanda, así que también conviene recordarlas.
export type Feriado = { fecha: string; nombre: string; oficial: boolean }

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// n-ésimo lunes del mes (m = 1..12)
const lunesNumero = (y: number, m: number, n: number) => {
  const primerDia = new Date(y, m - 1, 1).getDay() // 0 = domingo
  const primerLunes = 1 + ((8 - primerDia) % 7)
  return iso(y, m, primerLunes + (n - 1) * 7)
}

// Domingo de Pascua (algoritmo gregoriano anónimo)
const pascua = (y: number) => {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(y, mes - 1, dia, 12)
}

const cache = new Map<number, Feriado[]>()

export function feriadosDelAnio(y: number): Feriado[] {
  const guardado = cache.get(y)
  if (guardado) return guardado

  const p = pascua(y)
  const relativoAPascua = (dias: number) => { const d = new Date(p); d.setDate(d.getDate() + dias); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()) }

  const lista: Feriado[] = [
    { fecha: iso(y, 1, 1), nombre: 'Año Nuevo', oficial: true },
    { fecha: lunesNumero(y, 2, 1), nombre: 'Día de la Constitución', oficial: true },
    { fecha: lunesNumero(y, 3, 3), nombre: 'Natalicio de Benito Juárez', oficial: true },
    { fecha: relativoAPascua(-3), nombre: 'Jueves Santo', oficial: false },
    { fecha: relativoAPascua(-2), nombre: 'Viernes Santo', oficial: false },
    { fecha: iso(y, 5, 1), nombre: 'Día del Trabajo', oficial: true },
    { fecha: iso(y, 5, 10), nombre: 'Día de las Madres', oficial: false },
    { fecha: iso(y, 9, 16), nombre: 'Día de la Independencia', oficial: true },
    { fecha: iso(y, 11, 2), nombre: 'Día de Muertos', oficial: false },
    { fecha: lunesNumero(y, 11, 3), nombre: 'Día de la Revolución', oficial: true },
    { fecha: iso(y, 12, 12), nombre: 'Día de la Virgen de Guadalupe', oficial: false },
    { fecha: iso(y, 12, 24), nombre: 'Nochebuena', oficial: false },
    { fecha: iso(y, 12, 25), nombre: 'Navidad', oficial: true },
    { fecha: iso(y, 12, 31), nombre: 'Fin de Año', oficial: false },
  ]
  // Cambio de gobierno federal: 1 de octubre cada seis años (2024, 2030, ...)
  if ((y - 2024) % 6 === 0) lista.push({ fecha: iso(y, 10, 1), nombre: 'Transmisión del Poder Ejecutivo', oficial: true })

  lista.sort((a, b) => a.fecha.localeCompare(b.fecha))
  cache.set(y, lista)
  return lista
}

export function feriadoEn(fecha: string): Feriado | undefined {
  if (!fecha) return undefined
  return feriadosDelAnio(parseInt(fecha.substring(0, 4), 10)).find(f => f.fecha === fecha)
}

// Feriados entre `desde` (inclusive) y `desde + dias`.
export function proximosFeriados(desde: string, dias: number): Feriado[] {
  const y = parseInt(desde.substring(0, 4), 10)
  const limite = new Date(desde + 'T12:00:00'); limite.setDate(limite.getDate() + dias)
  const hasta = iso(limite.getFullYear(), limite.getMonth() + 1, limite.getDate())
  return [...feriadosDelAnio(y), ...feriadosDelAnio(y + 1)].filter(f => f.fecha >= desde && f.fecha <= hasta)
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((new Date(hasta + 'T12:00:00').getTime() - new Date(desde + 'T12:00:00').getTime()) / 86400000)
}
