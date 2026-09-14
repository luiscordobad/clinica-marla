"use client"

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function RegistroPaciente() {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    fecha_nacimiento: '',
    genero: '',
    origen: '',
    residencia: '',
    correo: '',
    telefono: '',
    escolaridad: '',
    profesion: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMensaje({ tipo: '', texto: '' })

    // Generamos el ID automático (ej: PAC-1718293)
    const nuevoId = `PAC-${Math.floor(Date.now() / 1000)}`

    const { error } = await supabase
      .from('pacientes')
      .insert([
        {
          id_paciente: nuevoId,
          nombre_completo: formData.nombre_completo,
          fecha_nacimiento: formData.fecha_nacimiento,
          genero: formData.genero,
          origen: formData.origen,
          residencia: formData.residencia,
          correo: formData.correo,
          telefono: formData.telefono,
          escolaridad: formData.escolaridad,
          profesion: formData.profesion
        }
      ])

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Paciente registrado con éxito!' })
      // Limpiamos el formulario para el siguiente paciente
      setFormData({
        nombre_completo: '', fecha_nacimiento: '', genero: '', origen: '',
        residencia: '', correo: '', telefono: '', escolaridad: '', profesion: ''
      })
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8 border border-gray-100">
        
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Registro de Nuevo Paciente</h1>
            <p className="text-sm text-gray-500 mt-1">Por favor llena la información básica</p>
          </div>
          <a href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            &larr; Volver al Inicio
          </a>
        </div>

        {mensaje.texto && (
          <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Columna Izquierda */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input required type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                <input required type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                <select required name="genero" value={formData.genero} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white">
                  <option value="">Selecciona...</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input required type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input required type="email" name="correo" value={formData.correo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origen (Ciudad/Estado)</label>
                <input type="text" name="origen" value={formData.origen} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Residencia Actual</label>
                <input type="text" name="residencia" value={formData.residencia} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Escolaridad</label>
                <input type="text" name="escolaridad" value={formData.escolaridad} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ocupación / Profesión</label>
                <input type="text" name="profesion" value={formData.profesion} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

          </div>

          <div className="pt-6 border-t">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300">
              {loading ? 'Guardando Paciente...' : 'Registrar Paciente'}
            </button>
          </div>
        </form>

      </div>
    </main>
  )
}
