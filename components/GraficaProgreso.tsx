"use client"

export type PuntoProgreso = { fecha: string; peso?: number | null; grasa?: number | null }

function formatearFechaCorta(fecha: string) {
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function MiniLineChart({ datos, color, unidad }: { datos: { fecha: string; valor: number }[]; color: string; unidad: string }) {
  if (datos.length === 0) return null

  const valores = datos.map(d => d.valor)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const ancho = 300
  const alto = 100
  const padY = 12

  const puntos = datos.map((d, i) => {
    const x = datos.length === 1 ? ancho / 2 : (i / (datos.length - 1)) * ancho
    const y = alto - padY - ((d.valor - min) / rango) * (alto - padY * 2)
    return { x, y, ...d }
  })

  const path = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full h-28" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        {puntos.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
        <span>{formatearFechaCorta(puntos[0].fecha)}</span>
        {puntos.length > 1 && <span>{formatearFechaCorta(puntos[puntos.length - 1].fecha)}</span>}
      </div>
      <div className="flex justify-between text-xs font-black mt-1" style={{ color }}>
        <span>{puntos[0].valor}{unidad}</span>
        {puntos.length > 1 && <span>{puntos[puntos.length - 1].valor}{unidad}</span>}
      </div>
    </div>
  )
}

export default function GraficaProgreso({ puntos }: { puntos: PuntoProgreso[] }) {
  const datosPeso = puntos.filter(p => p.peso !== null && p.peso !== undefined).map(p => ({ fecha: p.fecha, valor: p.peso as number }))
  const datosGrasa = puntos.filter(p => p.grasa !== null && p.grasa !== undefined).map(p => ({ fecha: p.fecha, valor: p.grasa as number }))

  if (datosPeso.length < 2 && datosGrasa.length < 2) {
    return (
      <p className="text-xs text-slate-400 font-bold text-center py-6">
        Todavía no hay suficientes consultas con peso/grasa registrados para mostrar una tendencia.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {datosPeso.length >= 2 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Peso (kg)</p>
          <MiniLineChart datos={datosPeso} color="#0066FF" unidad=" kg" />
        </div>
      )}
      {datosGrasa.length >= 2 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Grasa Corporal (%)</p>
          <MiniLineChart datos={datosGrasa} color="#F43F5E" unidad="%" />
        </div>
      )}
    </div>
  )
}
