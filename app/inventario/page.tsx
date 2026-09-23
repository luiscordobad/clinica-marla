"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { obtenerEstadoSesion } from '../../lib/auth'
import { useCierreAutomatico } from '../../lib/inactividad'
import Link from 'next/link'
import type { Producto } from '../../lib/types'

export default function ModuloInventario() {
  const [inventario, setInventario] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [autoLogoutMinutos, setAutoLogoutMinutos] = useState<number | null>(null)
  useCierreAutomatico(autoLogoutMinutos)

  const [showModal, setShowModal] = useState(false)
  const [productoEdit, setProductoEdit] = useState<Producto | null>(null)
  const [formStock, setFormStock] = useState({ stock_agregar: '0', nuevo_costo: '', nuevo_precio: '' })

  const [showNuevoProducto, setShowNuevoProducto] = useState(false)
  const [formNuevo, setFormNuevo] = useState({ nombre: '', costo: '', precio: '', stock_inicial: '', proveedor: '' })

  useEffect(() => {
    const iniciar = async () => {
      const estado = await obtenerEstadoSesion()
      if (estado.tipo !== 'activa') { window.location.href = '/login'; return }
      setAutoLogoutMinutos(estado.sesion.usuario.auto_logout_minutos)
      if (!estado.sesion.esFullAccess) { setSinPermiso(true); setLoading(false); return }
      await cargarInventario()
    }
    iniciar()
  }, [])

  const cargarInventario = async () => {
    const { data } = await supabase.from('inventario').select('*').order('producto', { ascending: true })
    if (data) setInventario(data as Producto[])
    setLoading(false)
  }

  const metricas = useMemo(() => {
    let capitalInvertido = 0, valorVentaTotal = 0, productosCriticos = 0
    inventario.forEach(p => {
      capitalInvertido += p.stock * p.costo_unit
      valorVentaTotal += p.stock * p.precio_venta
      if (p.stock <= 10) productosCriticos++
    })
    return { capitalInvertido, valorVentaTotal, gananciaPotencial: valorVentaTotal - capitalInvertido, productosCriticos, totalItems: inventario.length }
  }, [inventario])

  const inventarioFiltrado = inventario.filter(p =>
    p.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.proveedor || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const abrirEdicion = (prod: Producto) => {
    setProductoEdit(prod)
    setFormStock({ stock_agregar: '0', nuevo_costo: String(prod.costo_unit), nuevo_precio: String(prod.precio_venta) })
    setShowModal(true)
  }

  const guardarActualizacionStock = async () => {
    if (!productoEdit) return
    const nuevoStock = productoEdit.stock + Number(formStock.stock_agregar)
    const { error } = await supabase.from('inventario').update({
      stock: nuevoStock,
      costo_unit: Number(formStock.nuevo_costo),
      precio_venta: Number(formStock.nuevo_precio),
    }).eq('id', productoEdit.id)

    if (!error) { await cargarInventario(); setShowModal(false) }
    else alert('Error actualizando producto: ' + error.message)
  }

  const crearNuevoProducto = async () => {
    if (!formNuevo.nombre.trim()) return alert('Ponle un nombre al producto.')
    const { error } = await supabase.from('inventario').insert([{
      producto: formNuevo.nombre,
      costo_unit: Number(formNuevo.costo) || 0,
      precio_venta: Number(formNuevo.precio) || 0,
      stock: Number(formNuevo.stock_inicial) || 0,
      proveedor: formNuevo.proveedor,
    }])

    if (!error) {
      await cargarInventario()
      setShowNuevoProducto(false)
      setFormNuevo({ nombre: '', costo: '', precio: '', stock_inicial: '', proveedor: '' })
    } else alert('Error creando producto: ' + error.message)
  }

  if (loading) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><p className="animate-pulse font-bold text-slate-400">Abriendo bóveda del almacén...</p></div>

  if (sinPermiso) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-sm text-center">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-black text-slate-800 mb-1">Sección restringida</p>
        <p className="text-sm text-slate-500 mb-6">El almacén y sus costos solo los puede ver una cuenta con Acceso Total.</p>
        <Link href="/" className="text-[#28363E] font-bold text-sm hover:underline">← Volver al Dashboard</Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6 md:p-10 font-sans text-slate-800 pb-20">

      {showModal && productoEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-1">Resurtir Producto</h3>
            <p className="text-sm font-bold text-teal-600 mb-6">{productoEdit.producto}</p>

            <div className="space-y-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Stock Actual</span>
                <span className="text-2xl font-black text-slate-800">{productoEdit.stock}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Unidades a ingresar (Nuevas)</label>
                <input type="number" value={formStock.stock_agregar} onChange={(e) => setFormStock({ ...formStock, stock_agregar: e.target.value })} className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-lg font-black text-center text-teal-600 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" placeholder="0" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Costo Proveedor</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                    <input type="number" value={formStock.nuevo_costo} onChange={(e) => setFormStock({ ...formStock, nuevo_costo: e.target.value })} className="w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Precio Público</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                    <input type="number" value={formStock.nuevo_precio} onChange={(e) => setFormStock({ ...formStock, nuevo_precio: e.target.value })} className="w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-3.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={guardarActualizacionStock} className="flex-1 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-teal-600 transition-all shadow-md">Ingresar al Almacén</button>
            </div>
          </div>
        </div>
      )}

      {showNuevoProducto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 border border-slate-200">
            <h3 className="text-2xl font-black text-slate-800 mb-1">Nuevo Producto</h3>
            <p className="text-xs text-slate-500 mb-6">Registra un nuevo suplemento en la farmacia.</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre Comercial</label>
                <input type="text" value={formNuevo.nombre} onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Proveedor / Marca</label>
                <input type="text" value={formNuevo.proveedor} onChange={(e) => setFormNuevo({ ...formNuevo, proveedor: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Costo de Compra ($)</label>
                <input type="number" value={formNuevo.costo} onChange={(e) => setFormNuevo({ ...formNuevo, costo: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Precio Público ($)</label>
                <input type="number" value={formNuevo.precio} onChange={(e) => setFormNuevo({ ...formNuevo, precio: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Stock Inicial (Unidades)</label>
                <input type="number" value={formNuevo.stock_inicial} onChange={(e) => setFormNuevo({ ...formNuevo, stock_inicial: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowNuevoProducto(false)} className="px-5 py-3.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={crearNuevoProducto} className="flex-1 bg-teal-600 text-white rounded-xl text-sm font-black hover:bg-slate-900 transition-all shadow-md">Crear Producto</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
          <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2">
            <span className="text-lg">&larr;</span> Volver al Dashboard
          </Link>
          <button onClick={() => setShowNuevoProducto(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-teal-600 transition-all shadow-md flex items-center gap-2">
            <span>📦</span> Alta de Producto
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-md text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 text-8xl opacity-10">💰</div>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1 relative z-10">Capital Congelado (Costo)</p>
              <p className="text-3xl font-black tracking-tighter relative z-10">${metricas.capitalInvertido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-400 mt-2 font-medium relative z-10">Dinero invertido en stock actual.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Venta Estimado</p>
              <p className="text-3xl font-black text-slate-800 tracking-tighter">${metricas.valorVentaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Ganancia Potencial</span>
                <span className="text-sm font-black text-emerald-500">+${metricas.gananciaPotencial.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className={`p-6 rounded-3xl shadow-sm border ${metricas.productosCriticos > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${metricas.productosCriticos > 0 ? 'text-red-500' : 'text-emerald-600'}`}>Alertas de Stock</p>
              <p className={`text-3xl font-black tracking-tighter ${metricas.productosCriticos > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {metricas.productosCriticos} <span className="text-sm font-bold">productos críticos</span>
              </p>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800">Catálogo ({metricas.totalItems})</h2>
              <div className="relative w-full sm:w-64">
                <span className="absolute left-4 top-2.5 text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por nombre o marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium focus:ring-2 focus:ring-teal-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Producto</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Costo Base</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Precio Público</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Stock</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inventarioFiltrado.map((p) => {
                    const margen = p.precio_venta - p.costo_unit
                    const pctMargen = p.precio_venta > 0 ? ((margen / p.precio_venta) * 100).toFixed(0) : '0'
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-slate-800">{p.producto}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.proveedor || 'Sin Proveedor'}</p>
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-slate-500">${p.costo_unit.toFixed(2)}</td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-black text-teal-700">${p.precio_venta.toFixed(2)}</p>
                          <p className="text-[9px] font-bold text-emerald-500">Margen {pctMargen}%</p>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${p.stock <= 5 ? 'bg-red-100 text-red-700' : p.stock <= 15 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button onClick={() => abrirEdicion(p)} className="bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                            Resurtir / Editar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {inventarioFiltrado.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold">No se encontraron productos en el almacén.</td></tr>
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
