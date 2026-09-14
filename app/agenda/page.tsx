"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function Agenda() {
  const [citas, setCitas] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Estado para la nueva cita
  const [nuevaCita, setNuevaCita] = useState({
    id_paciente: '',
    fecha_cita: '',
    hora_cita: '',
    motivo: ''
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    // 1. Traer las citas programadas (ordenadas por fecha y hora)
    const { data: citasData } = await supabase
      .from('citas')
      .select('*')
      .order('fecha_cita', { ascending: true })
      .order('hora_cita', { ascending: true })
    
    if (citasData) setCitas(citasData)

    // 2. Traer la lista de pacientes para el selector del formulario
    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('id_paciente, nombre_completo')
      .order('nombre_completo', { ascending: true })

    if (pacientesData) setPacientes(pacientesData)

    setLoading(false)
  }

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Buscamos el nombre del paciente seleccionado para guardarlo directo en la cita
    const pacienteSeleccionado = pacientes.find(p => p.id_paciente === nuevaCita.id_paciente)

    const { error } = await supabase
      .from('citas')
      .insert([
        {
          id_paciente: nuevaCita.id_paciente,
          nombre_paciente: pacienteSeleccionado?.nombre_completo || 'Desconocido',
          fecha_cita: nuevaCita.fecha_cita,
          hora_cita: nuevaCita.hora_cita,
          motivo: nuevaCita.motivo,
          estado: 'Programada'
        }
      ])

    if (!error) {
      await cargarDatos()
      setShowModal(false)
      setNuevaCita({ id_paciente: '', fecha_cita: '', hora_cita: '', motivo: '' })
    } else {
      alert("Error al agendar: " + error.message)
    }
    
    setSaving(false)
  }

  const cambiarEstado = async (id: number, nuevoEstado: string) => {
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id_cita', id)
    
    if (!error) cargarDatos()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium animate-pulse">Cargando agenda...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 relative">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition-colors">
            &larr; Volver al Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Agenda de Citas</h1>
        </div>

        {/* Panel Principal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-lg font-bold text-gray-800">Próximas Consultas</h2>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              + Agendar Cita
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm">
                  <th className="p-3 border-b font-medium">Fecha y Hora</th>
                  <th className="p-3 border-b font-medium">Paciente</th>
                  <th className="p-3 border-b font-medium">Motivo</th>
                  <th className="p-3 border-b font-medium">Estado</th>
                  <th className="p-3 border-b font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {citas.map((cita) => (
                  <tr key={cita.id_cita} className={`border-b text-sm transition-colors ${cita.estado === 'Cancelada' ? 'bg-red-50 opacity-60' : cita.estado === 'Completada' ? 'bg-green-50 opacity-60' : 'hover:bg-gray-50'}`}>
                    <td className="p-3 text-gray-900 font-semibold whitespace-nowrap">
                      {new Date(cita.fecha_cita + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })} <br/>
                      <span className="text-blue-600 font-bold">{cita.hora_cita.substring(0,5)}</span>
                    </td>
                    <td className="p-3 text-gray-900 font-medium">
                      <Link href={`/paciente/${cita.id_paciente}`} className="hover:text-blue-600 hover:underline">
                        {cita.nombre_paciente}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-500 max-w-[200px] truncate">
                      {cita.motivo || 'Consulta General'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        cita.estado === 'Programada' ? 'bg-yellow-100 text-yellow-800' :
                        cita.estado === 'Completada' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cita.estado}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      {cita.estado === 'Programada' && (
                        <>
                          <button onClick={() => cambiarEstado(cita.id_cita, 'Completada')} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 font-bold transition-colors">
                            ✓ Asistió
                          </button>
                          <button onClick={() => cambiarEstado(cita.id_cita, 'Cancelada')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 font-bold transition-colors">
                            ✕ Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {citas.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 italic">No hay citas programadas en la agenda.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Agendar Nueva Cita */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h3 className="text-xl font-bold text-gray-800">Agendar Cita</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleAgendar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                <select 
                  required 
                  value={nuevaCita.id_paciente} 
                  onChange={(e) => setNuevaCita({...nuevaCita, id_paciente: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Selecciona un paciente --</option>
                  {pacientes.map(p => (
                    <option key={p.id_paciente} value={p.id_paciente}>{p.nombre_completo}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input required type="date" value={nuevaCita.fecha_cita} onChange={(e) => setNuevaCita({...nuevaCita, fecha_cita: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <input required type="time" value={nuevaCita.hora_cita} onChange={(e) => setNuevaCita({...nuevaCita, hora_cita: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (Opcional)</label>
                <input type="text" value={nuevaCita.motivo} onChange={(e) => setNuevaCita({...nuevaCita, motivo: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="Ej. Revisión mensual, entrega de dieta..." />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold disabled:bg-blue-300">
                  {saving ? 'Guardando...' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
