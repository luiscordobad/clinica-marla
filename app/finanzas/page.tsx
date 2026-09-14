"use client"

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function ModuloFinanzas() {
  const [egresos, setEgresos] = useState<any[]>([])
  const [ingresos, setIngresos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMes, setFiltroMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // Estado del formulario
  const [formEgreso, setFormEgreso] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    categoria: 'Fijos (Renta, Servicios)',
    monto: ''
  })

  useEffect(() => {
    cargarDatosFinancieros()
  }, [filtroMes])

  const cargarDatosFinancieros = async () => {
    setLoading(true)
    const [year, month] = filtroMes.split('-')
    const primerDia = `${year}-${month}-01`
    const ultimoDia = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]

    const [ { data: dataEgresos }, { data: dataIngresos } ] = await Promise.all([
      supabase.from('egresos').select('*').gte('fecha', primerDia).lte('fecha', ultimoDia).order('fecha', { ascending: false }),
      supabase.from('transacciones').select('monto_cobrado, Monto_Cobrado, fecha, Fecha').gte('fecha', primerDia).lte('fecha', ultimoDia)
    ])

    if (dataEgresos) setEgresos(dataEgresos)
    if (dataIngresos) setIngresos(dataIngresos)
    setLoading(false)
  }

  const registrarEgreso = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('egresos').insert([{
      fecha: formEgreso.fecha,
      concepto: formEgreso.concepto,
      categoria: formEgreso.categoria,
      monto: Number(formEgreso.monto)
    }])

    if (!error) {
      setFormEgreso({ ...formEgreso, concepto: '', monto: '' })
      cargarDatosFinancieros()
    } else {
      alert('Error al registrar el gasto: ' + error.message)
    }
  }

  // --- MOTOR CONTABLE ---
  const contabilidad = useMemo(() => {
    const totalIngresos = ingresos.reduce((acc, curr) => acc + Number(curr.monto_cobrado || curr.Monto_Cobrado || 0), 0)
    const totalEgresos = egresos.reduce((acc, curr) => acc + Number(curr.monto || 0), 0)
    const utilidadNeta = totalIngresos - totalEgresos
    const margen = totalIngresos > 0 ? ((utilidadNeta / totalIngresos) * 100).toFixed(1) : 0

    return { totalIngresos, totalEgresos, utilidadNeta, margen }
  }, [egresos, ingresos])

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 font-sans text-slate-800 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
          <div>
            <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2 inline-block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Cierre Contable y Egresos</h1>
          </div>
          <input 
            type="month" 
            value={filtroMes} 
            onChange={(e) => setFiltroMes(e.target.value)}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          />
        </div>

        {/* ESTADO DE RESULTADOS (P&L) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 border-t-4 border-t-emerald-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos Brutos</p>
            <p className="text-3xl font-black text-slate-800">${contabilidad.totalIngresos.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 border-t-4 border-t-red-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gastos Operativos</p>
            <p className="text-3xl font-black text-slate-800">${contabilidad.totalEgresos.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-md border border-slate-800 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-7xl opacity-10">📈</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilidad Neta (Ganancia)</p>
            <p className="text-3xl font-black text-white">${contabilidad.utilidadNeta.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
            <p className="text-xs font-bold text-emerald-400 mt-2 bg-emerald-400/10 inline-block px-2 py-1 rounded-md">Margen del {contabilidad.margen}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORMULARIO DE EGRESOS */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1 h-fit">
            <h2 className="text-lg font-black text-slate-800 mb-6">Registrar Gasto</h2>
            <form onSubmit={registrarEgreso} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha</label>
                <input type="date" required value={formEgreso.fecha} onChange={e => setFormEgreso({...formEgreso, fecha: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                <select value={formEgreso.categoria} onChange={e => setFormEgreso({...formEgreso, categoria: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500">
                  <option>Fijos (Renta, Servicios)</option>
                  <option>Insumos Clínicos</option>
                  <option>Marketing y Publicidad</option>
                  <option>Nómina / Asistente</option>
                  <option>Impuestos / Contabilidad</option>
                  <option>Otros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Concepto</label>
                <input type="text" required placeholder="Ej. Pago de CFE" value={formEgreso.concepto} onChange={e => setFormEgreso({...formEgreso, concepto: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Monto ($)</label>
                <input type="number" required min="1" step="0.01" placeholder="0.00" value={formEgreso.monto} onChange={e => setFormEgreso({...formEgreso, monto: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-black py-3.5 rounded-xl mt-2 hover:bg-teal-600 transition-all shadow-md">
                Guardar Egreso
              </button>
            </form>
          </div>

          {/* LIBRO MAYOR (TABLA DE GASTOS) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-800">Historial de Gastos</h2>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Concepto</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold">Calculando finanzas...</td></tr>
                  ) : egresos.length === 0 ? (
                    <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold">No hay gastos registrados en este mes.</td></tr>
                  ) : (
                    egresos.map(gasto => (
                      <tr key={gasto.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-6 text-sm font-bold text-slate-600">{new Date(gasto.fecha + 'T12:00:00').toLocaleDateString('es-MX')}</td>
                        <td className="py-4 px-6 text-sm font-bold text-slate-800">{gasto.concepto}</td>
                        <td className="py-4 px-6">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200">
                            {gasto.categoria}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-sm font-black text-red-600">
                          -${Number(gasto.monto).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
