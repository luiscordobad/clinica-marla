// new Date().toISOString() siempre da la fecha en UTC. México (sin horario de
// verano desde 2022) está en UTC-6, así que cerca de la medianoche local
// toISOString() ya reporta el día siguiente — un bloqueo/cita/reporte de "hoy"
// se calcularía mal justo en las horas en que más se usa la clínica (tarde-noche).
// Esta función arma la fecha usando los componentes LOCALES del navegador.
export function fechaLocalISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}
