"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'

// Cambia estos correos por tu correo real y el de Marla
const CORREOS_ADMIN = ['luiscordobad@gmail.com', 'marla@mail.com']

const SERVICIOS = [
  { id: 'Primera Vez', label: 'Primera Vez', precio: '1000', icon: '🌟' },
  { id: 'Subsecuente', label: 'Subsecuente', precio: '800', icon: '🔄' },
  { id: 'Medica', label: 'Médica', precio: '800', icon: '🩺' },
  { id: 'En Linea', label: 'En Línea', precio: '700', icon: '💻' },
  { id: 'InBody', label: 'Solo InBody', precio: '500', icon: '⚖️' },
  { id: 'Enzimas', label: 'Enzimas', precio: '4500', icon: '💉' },
  { id: 'Solo Suplementos', label: 'Suplementos', precio: '0', icon: '🛍️' }
]

export default function ExpedientePaciente({ params }: { params: { id: string } }) {
  const [esAdmin, setEsAdmin] = useState(false)
  
  const [paciente, setPaciente] = useState<any>(null)
  const [transacciones, setTransacciones] = useState<any[]>([])
  const [catalogo, setCatalogo] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)

  const [modoConsulta, setModoConsulta] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [seccionActiva, setSeccionActiva] = useState('antecedentes')
  const [realizarPlicometria, setRealizarPlicometria] = useState('No')

  const [showEditPaciente, setShowEditPaciente] = useState(false)
  const [editForm, setEditForm] = useState({ nombre_completo: '', fecha_nacimiento: '', telefono: '', correo: '' })

  // IGNORAR LAS DE "SALA DE ESPERA" PARA SABER SI ES SU PRIMERA CONSULTA REAL
  const transaccionesReales = transacciones.filter(t => t.metodo_pago !== 'En Sala de Espera' && t.Metodo_Pago !== 'En Sala de Espera')
  const esPrimeraVez = transaccionesReales.length === 0

  // BUSCAR SI EL PACIENTE ESTÁ EN LA SALA DE ESPERA HOY
  const hoyStr = new Date().toISOString().split('T')[0]
  const visitaEnEspera = transacciones.find(t => 
    (t.metodo_pago === 'En Sala de Espera' || t.Metodo_Pago === 'En Sala de Espera') && 
    String(t.fecha || t.Fecha).includes(hoyStr)
  )

  const [formClinico, setFormClinico] = useState({
    heredo_familiares: '', patologicos: '', cirugias: '', no_patologicos: '',
    laboratorios: '', medicamentos: '', suplementos_actuales: '', sueno: '', objetivos: '',
    circ_abdominal: '', circ_umbilical: '', bicep_izq_reposo: '', bicep_izq_flexion: '',
    bicep_der_reposo: '', bicep_der_flexion: '', gluteo: '', muslo: '', pecho: '',
    p_abdominal: '', p_triceps: '', p_biceps: '', p_subescapular: '', p_suprailiaco: '', p_muslo: '', p_pantorrilla: '', p_pectoral: '', p_medio_axilar: '',
    peso_kg: '', musculo_esqu_kg: '', masa_grasa_kg: '', grasa_pct: '', grasa_visceral: '',
    tmb_kcal: '', agua_total_lt: '', peso_ideal_kg: '', grasa_bajar_kg: '', musculo_subir_kg: '',
    alergias_intolerancias: '', alcohol: '', cigarro: '', vape: '', drogas: '', agua_diaria: '', ansiedad: '',
    recordatorio_24h: '', restricciones_alimentarias: '', alimentos_mas_consumidos: '', alimentos_menos_consumidos: '',
    actividad_fisica_freq: '', actividad_fisica_duracion: '', actividad_fisica_intensidad: '',
    deporte_disciplina: '', distancia_carrera: '',
    enfoque: 'Deficit Calorico Ligero', aporte_calorico: '', tiempos_comida: '3',
    pct_carbohidratos: '', pct_proteinas: '', pct_grasas: '', notas_suplementos_recetados: '',
    notas_seguimiento_general: ''
  })

  // --- CARRITO CLÍNICO DE MARLA ---
  const [checkout, setCheckout] = useState({
    tipo_consulta: '', 
    precio_consulta: '',
    tipo_descuento: 'Ninguno', 
    valor_descuento: '',
    proxima_fecha: '', 
    proxima_hora: ''
  })
  const [productosVenta, setProductosVenta] = useState<string[]>([''])

  const extraerFechaLocal = (val: any) => {
    if (!val) return null;
    const str = String(val).trim();
    const matchISO = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (matchISO) return new Date(Number(matchISO[1]), Number(matchISO[2]) - 1, Number(matchISO[3]), 12);
    const matchLatino = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchLatino) return new Date(Number(matchLatino[3]), Number(matchLatino[2]) - 1, Number(matchLatino[1]), 12);
    return null;
  }

  const getUnixTime = (val: any) => {
    const d = extraerFechaLocal(val);
    return d ? d.getTime() : 0;
  }

  const formatearFechaDisplay = (val: any) => {
    const d = extraerFechaLocal(val);
    if (!d) return 'Fecha sin registro';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} de ${meses[d.getMonth()]} del ${d.getFullYear()}`;
  }

  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setEsAdmin(CORREOS_ADMIN.includes(session.user.email || ''))
      }
      cargarDatos()
    }
    verificarSesion()
  }, [params.id])

  const cargarDatos = async () => {
    const { data: pData } = await supabase.from('pacientes').select('*').eq('id_paciente', params.id).single()
    if (pData) setPaciente(pData)

    const { data: tData } = await supabase.from('transacciones').select('*').eq('id_paciente', params.id)
    if (tData) {
      const transaccionesOrdenadas = tData.sort((a, b) => getUnixTime(b.fecha || b.Fecha) - getUnixTime(a.fecha || a.Fecha));
      setTransacciones(transaccionesOrdenadas)
    }

    const { data: invData } = await supabase.from('inventario').select('*').order('producto', { ascending: true })
    if (invData) setCatalogo(invData)

    setLoading(false)
  }

  const abrirEdicionPaciente = () => {
    setEditForm({
      nombre_completo: paciente.nombre_completo || paciente.Nombre_Completo || '',
      fecha_nacimiento: paciente.fecha_nacimiento || paciente.Fecha_Nacimiento || '',
      telefono: paciente.telefono || paciente.Telefono || '',
      correo: paciente.correo || paciente.Correo || ''
    })
    setShowEditPaciente(true)
  }

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const guardarEdicionPaciente = async () => {
    const idColumn = paciente.id_paciente !== undefined ? 'id_paciente' : 'ID_Paciente';
    const dataToUpdate = paciente.nombre_completo !== undefined ? {
      nombre_completo: editForm.nombre_completo,
      fecha_nacimiento: editForm.fecha_nacimiento,
      telefono: editForm.telefono,
      correo: editForm.correo
    } : {
      Nombre_Completo: editForm.nombre_completo,
      Fecha_Nacimiento: editForm.fecha_nacimiento,
      Telefono: editForm.telefono,
      Correo: editForm.correo
    };

    const { error } = await supabase.from('pacientes').update(dataToUpdate).eq(idColumn, params.id)
    if (!error) {
      await cargarDatos()
      setShowEditPaciente(false)
    } else {
      alert("Error actualizando perfil: " + error.message)
    }
  }

  // =======================================================
  // FUNCIÓN DE LA ASISTENTE: CHECK-IN
  // =======================================================
  const hacerCheckIn = async () => {
    const nuevoId = `TRX-${Math.floor(Date.now() / 1000)}`
    const hoyForzado = `${hoyStr} 12:00:00`
    
    const { error } = await supabase.from('transacciones').insert([{
      id_transaccion: nuevoId,
      id_paciente: params.id,
      cliente: paciente.nombre_completo || paciente.Nombre_Completo,
      fecha: hoyForzado,
      metodo_pago: 'En Sala de Espera',
      es_consulta: 'Check-In',
      concepto_historico: 'Esperando Consulta'
    }])

    if (!error) {
      await cargarDatos()
      alert('✅ Paciente registrado en Sala de Espera. La Dra. Marla ha sido notificada.')
    } else {
      alert('Error en el Check-In: ' + error.message)
    }
  }

  // =======================================================
  // FUNCIONES DE LA DOCTORA (MARLA): CONSULTA Y CIERRE
  // =======================================================
  const iniciarConsulta = () => {
    setSeccionActiva(esPrimeraVez ? 'antecedentes' : 'seguimiento_notas')
    setModoConsulta(true)
  }

  const abrirCheckout = () => {
    setModoConsulta(false)
    setShowCheckout(true)
    if (!checkout.tipo_consulta) {
      const tipoBase = esPrimeraVez ? 'Primera Vez' : 'Subsecuente'
      const precioBase = esPrimeraVez ? '1000' : '800'
      setCheckout(prev => ({ ...prev, tipo_consulta: tipoBase, precio_consulta: precioBase }))
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormClinico({ ...formClinico, [e.target.name]: e.target.value })
  }

  const handleCheckoutChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCheckout({ ...checkout, [e.target.name]: e.target.value })
  }

  const handleServiceSelect = (id: string, precio: string) => {
    setCheckout(prev => ({ ...prev, tipo_consulta: id, precio_consulta: precio }))
  }

  const handleProductSelectChange = (index: number, val: string) => {
    const copia = [...productosVenta]
    copia[index] = val
    setProductosVenta(copia)
  }

  const agregarRenglonProducto = () => {
    if (productosVenta.length < 6) setProductosVenta([...productosVenta, ''])
  }

  const subtotalConsulta = Number(checkout.precio_consulta) || 0;
  const subtotalProductos = productosVenta.reduce((acc, pId) => {
    const prod = catalogo.find(item => item.id_prod === pId || item.ID_PROD === pId)
    return acc + (prod ? (Number(prod.precio_venta || prod.PRECIO_VENTA) || 0) : 0)
  }, 0);
  const subtotalGeneral = subtotalConsulta + subtotalProductos;

  let descuentoAplicado = 0;
  if (checkout.tipo_descuento === 'Porcentaje') {
    descuentoAplicado = subtotalGeneral * ((Number(checkout.valor_descuento) || 0) / 100);
  } else if (checkout.tipo_descuento === 'Fijo') {
    descuentoAplicado = Number(checkout.valor_descuento) || 0;
  }
  const totalAPagar = Math.max(0, subtotalGeneral - descuentoAplicado);

  const mandarARecepcion = async () => {
    const productosLimpios = productosVenta.filter(p => p !== '')
    const hoyForzado = `${hoyStr} 12:00:00`;

    const dataTransaccion = {
      peso_actual: formClinico.peso_kg ? parseFloat(formClinico.peso_kg) : null,
      porcentaje_grasa: formClinico.grasa_pct ? parseFloat(formClinico.grasa_pct) : null,
      musculo_kg: formClinico.musculo_esqu_kg ? parseFloat(formClinico.musculo_esqu_kg) : null,
      monto_cobrado: totalAPagar, 
      metodo_pago: 'Pendiente en Caja', // ETIQUETA PARA LA ASISTENTE
      notas_evolucion: esPrimeraVez ? 'Consulta Inicial' : formClinico.notas_seguimiento_general,
      es_consulta: checkout.tipo_consulta,
      concepto_historico: checkout.tipo_consulta,
      producto_1: productosLimpios[0] || null,
      producto_2: productosLimpios[1] || null,
      producto_3: productosLimpios[2] || null,
      producto_4: productosLimpios[3] || null,
      producto_5: productosLimpios[4] || null,
      producto_6: productosLimpios[5] || null
    }

    let error;

    // Si la asistente lo puso en Sala de Espera, actualizamos ese registro. Si no, creamos uno nuevo.
    if (visitaEnEspera) {
      const idCol = visitaEnEspera.id_transaccion !== undefined ? 'id_transaccion' : 'ID_Transaccion';
      const res = await supabase.from('transacciones').update(dataTransaccion).eq(idCol, visitaEnEspera[idCol])
      error = res.error
    } else {
      const nuevoIdTransaccion = `TRX-${Math.floor(Date.now() / 1000)}`
      const res = await supabase.from('transacciones').insert([{
        ...dataTransaccion,
        id_transaccion: nuevoIdTransaccion,
        id_paciente: params.id,
        cliente: paciente.nombre_completo || paciente.Nombre_Completo,
        fecha: hoyForzado
      }])
      error = res.error
    }

    if (!error) {
      if (checkout.proxima_fecha && checkout.proxima_hora) {
        await supabase.from('citas').insert([{
          id_paciente: params.id,
          nombre_paciente: paciente.nombre_completo || paciente.Nombre_Completo,
          fecha_cita: checkout.proxima_fecha,
          hora_cita: checkout.proxima_hora,
          motivo: checkout.tipo_consulta,
          estado: 'Programada'
        }])
      }
      await cargarDatos()
      setShowCheckout(false)
      setModoConsulta(false)
      setProductosVenta([''])
      alert("¡Listo! El paciente ha sido enviado a recepción para que la asistente realice el cobro.")
    } else {
      alert("Error enviando a caja: " + error.message)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><p className="animate-pulse font-bold text-slate-400">Cargando expediente...</p></div>
  if (!paciente) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><Link href="/" className="text-teal-600 font-bold hover:underline">Volver</Link></div>

  // ==============================================================================
  // VISTA 1: WIZARD CLÍNICO CON TODOS LOS FORMULARIOS (SOLO MARLA LO VE)
  // ==============================================================================
  if (modoConsulta && esAdmin) {
    return (
      <main className="min-h-screen bg-[#F5F5F7] flex flex-col lg:flex-row">
        <div className="w-full lg:w-72 bg-slate-900 text-slate-300 flex flex-col sticky top-0 lg:h-screen z-20">
          <div className="p-5 bg-slate-950 border-b border-slate-800">
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mb-1.5 ${esPrimeraVez ? 'bg-amber-500 text-amber-950' : 'bg-teal-500 text-teal-950'}`}>
              {esPrimeraVez ? 'Estudio de Primera Vez' : 'Control de Seguimiento'}
            </span>
            <h2 className="text-white font-black text-md truncate">{paciente.nombre_completo || paciente.Nombre_Completo}</h2>
          </div>
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto p-3 gap-1 flex-1">
            {esPrimeraVez ? (
              <>
                {[
                  { id: 'antecedentes', label: '1. Antecedentes', icon: '📝' },
                  { id: 'mediciones', label: '2. Talla y Mediciones', icon: '📏' },
                  { id: 'peso', label: '3. Peso e InBody', icon: '⚖️' },
                  { id: 'estilo', label: '4. Estilo de Vida', icon: '🥗' },
                  { id: 'enfoque', label: '5. Enfoque Nutricional', icon: '🎯' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setSeccionActiva(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left whitespace-nowrap transition-all ${seccionActiva === tab.id ? 'bg-teal-600 text-white shadow-md' : 'hover:bg-slate-800'}`}>
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                {[
                  { id: 'seguimiento_notas', label: '1. Notas de Evolución', icon: '🗣️' },
                  { id: 'mediciones', label: '2. Control Corporal', icon: '⚖️' },
                  { id: 'enfoque', label: '3. Ajuste de Plan', icon: '🔄' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setSeccionActiva(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left whitespace-nowrap transition-all ${seccionActiva === tab.id ? 'bg-teal-600 text-white shadow-md' : 'hover:bg-slate-800'}`}>
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <button onClick={abrirCheckout} className="w-full py-3 bg-teal-500 text-teal-950 rounded-xl text-xs font-black hover:bg-teal-400 transition-all shadow-md text-center">
              Recetar y Mandar a Caja &rarr;
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10">
            
            {seccionActiva === 'antecedentes' && esPrimeraVez && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">1. Historial de Antecedentes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Antecedentes Heredo Familiares</label><textarea name="heredo_familiares" value={formClinico.heredo_familiares} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2}/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Antecedentes Personales Patológicos</label><textarea name="patologicos" value={formClinico.patologicos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2}/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Cirugías</label><textarea name="cirugias" value={formClinico.cirugias} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2}/></div>
                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Antecedentes Personales No Patológicos</label><textarea name="no_patologicos" value={formClinico.no_patologicos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2}/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Resultados de Laboratorios</label><input type="text" name="laboratorios" value={formClinico.laboratorios} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Medicamentos</label><input type="text" name="medicamentos" value={formClinico.medicamentos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Suplementos que toma actualmente</label><input type="text" name="suplementos_actuales" value={formClinico.suplementos_actuales} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Patrón de Sueño</label><input type="text" name="sueno" value={formClinico.sueno} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" placeholder="Horas, calidad del descanso..."/></div>
                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Objetivos Clínicos / Estéticos</label><input type="text" name="objetivos" value={formClinico.objetivos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"/></div>
                </div>
              </div>
            )}

            {seccionActiva === 'seguimiento_notas' && !esPrimeraVez && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">1. Seguimiento Clínico</h3>
                <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 text-sm text-sky-900 font-medium shadow-sm">
                  <span className="font-bold block mb-1">Evolución previa:</span> {transaccionesReales[0]?.notas_evolucion || transaccionesReales[0]?.notas || 'Sin anotaciones previas.'}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Notas de evolución actuales (apego, síntomas, cambios)</label>
                  <textarea name="notas_seguimiento_general" value={formClinico.notas_seguimiento_general} onChange={handleFormChange} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all min-h-[160px] shadow-sm" placeholder="Escribe aquí los comentarios de la sesión..."/>
                </div>
              </div>
            )}

            {seccionActiva === 'mediciones' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">2. Antropometría y Mediciones</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Circ. Abdominal (cm)</label><input type="number" name="circ_abdominal" value={formClinico.circ_abdominal} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Circ. Umbilical (cm)</label><input type="number" name="circ_umbilical" value={formClinico.circ_umbilical} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Pecho (cm)</label><input type="number" name="pecho" value={formClinico.pecho} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Glúteo (cm)</label><input type="number" name="gluteo" value={formClinico.gluteo} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Muslo (cm)</label><input type="number" name="muslo" value={formClinico.muslo} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"/></div>
                  
                  <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1">Bicep Izq (Reposo/Flex)</label><input type="text" name="bicep_izq_reposo" value={formClinico.bicep_izq_reposo} onChange={handleFormChange} placeholder="Ej. 32 / 35" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"/></div>
                  <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1">Bicep Der (Reposo/Flex)</label><input type="text" name="bicep_der_reposo" value={formClinico.bicep_der_reposo} onChange={handleFormChange} placeholder="Ej. 32.5 / 35.2" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"/></div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 mt-6 shadow-sm">
                  <div className="flex justify-between items-center"><label className="text-sm font-bold text-slate-700">¿Realizar Plicometría de Pliegues?</label><select value={realizarPlicometria} onChange={(e) => setRealizarPlicometria(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"><option value="No">No</option><option value="Si">Sí</option></select></div>
                  
                  {realizarPlicometria === 'Si' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-200">
                      {['Abdominal', 'Triceps', 'Biceps', 'Subescapular', 'Suprailiaco', 'Muslo', 'Pantorrilla', 'Pectoral', 'Medio_Axilar'].map(p => (
                        <div key={p}><label className="block text-[11px] font-medium text-slate-500 mb-1.5 ml-1">Pliegue {p.replace('_', ' ')} (mm)</label><input type="number" name={`p_${p.toLowerCase()}`} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {seccionActiva === 'peso' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">3. Composición Corporal (InBody)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Peso Total Actual (kg)</label><input type="number" step="0.1" name="peso_kg" value={formClinico.peso_kg} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Masa Muscular Esquelética (kg)</label><input type="number" step="0.1" name="musculo_esqu_kg" value={formClinico.musculo_esqu_kg} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Masa Grasa Corporal (kg)</label><input type="number" step="0.1" name="masa_grasa_kg" value={formClinico.masa_grasa_kg} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Porcentaje de Grasa (%)</label><input type="number" step="0.1" name="grasa_pct" value={formClinico.grasa_pct} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-red-500 outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Grasa Visceral (Nivel)</label><input type="number" name="grasa_visceral" value={formClinico.grasa_visceral} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">TMB (kcal)</label><input type="number" name="tmb_kcal" value={formClinico.tmb_kcal} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Agua Corporal Total (Lts)</label><input type="number" step="0.1" name="agua_total_lt" value={formClinico.agua_total_lt} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Peso Ideal Configurado (kg)</label><input type="number" step="0.1" name="peso_ideal_kg" value={formClinico.peso_ideal_kg} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-red-600 mb-1.5 ml-1">Grasa a bajar (kg)</label><input type="number" step="0.1" name="grasa_bajar_kg" value={formClinico.grasa_bajar_kg} onChange={handleFormChange} className="w-full p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"/></div>
                  <div><label className="block text-xs font-bold text-teal-600 mb-1.5 ml-1">Músculo a subir (kg)</label><input type="number" step="0.1" name="musculo_subir_kg" value={formClinico.musculo_subir_kg} onChange={handleFormChange} className="w-full p-4 bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"/></div>
                </div>
              </div>
            )}

            {seccionActiva === 'estilo' && esPrimeraVez && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">4. Alimentación y Estilo de Vida</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Alergias o Intolerancias</label><input type="text" name="alergias_intolerancias" value={formClinico.alergias_intolerancias} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Consumo de Agua Diario</label><input type="text" name="agua_diaria" value={formClinico.agua_diaria} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Ansiedad / Estrés</label><select name="ansiedad" value={formClinico.ansiedad} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"><option value="No">No presenta</option><option value="Leve">Leve</option><option value="Moderada">Moderada</option><option value="Alta">Alta</option></select></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Restricciones Alimentarias</label><input type="text" name="restricciones_alimentarias" value={formClinico.restricciones_alimentarias} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  
                  <div className="flex gap-4 text-xs font-bold bg-slate-50 border border-slate-200 p-4 rounded-3xl col-span-full justify-between items-center shadow-sm">
                     {['Alcohol', 'Cigarro', 'Vape', 'Drogas'].map(h => (
                       <div key={h} className="flex flex-col items-center w-full"><span className="text-slate-500 mb-2">{h}</span><select name={h.toLowerCase()} onChange={handleFormChange} className="p-2.5 bg-white border border-slate-200 rounded-xl w-full text-center outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"><option value="No">No</option><option value="Social">Social</option><option value="Frecuente">Frecuente</option></select></div>
                     ))}
                  </div>

                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Recordatorio de 24 Horas (Alimentación diaria normal)</label><textarea name="recordatorio_24h" value={formClinico.recordatorio_24h} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" rows={3}/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Alimentos más consumidos</label><input type="text" name="alimentos_mas_consumidos" value={formClinico.alimentos_mas_consumidos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Alimentos menos consumidos</label><input type="text" name="alimentos_menos_consumidos" value={formClinico.alimentos_menos_consumidos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"/></div>

                  <div className="col-span-full bg-slate-50 p-5 rounded-3xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
                    <p className="col-span-full font-bold text-sm text-slate-700">Actividad Física</p>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Frecuencia Semanal</label><input type="text" name="actividad_fisica_freq" value={formClinico.actividad_fisica_freq} onChange={handleFormChange} placeholder="Ej. 4 días" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"/></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Duración Sesión</label><input type="text" name="actividad_fisica_duracion" value={formClinico.actividad_fisica_duracion} onChange={handleFormChange} placeholder="Ej. 1 hora" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"/></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Intensidad</label><select name="actividad_fisica_intensidad" value={formClinico.actividad_fisica_intensidad} onChange={handleFormChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"><option>Moderada</option><option>Ligera</option><option>Vigorosa</option></select></div>
                    
                    <div className="col-span-full"><label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Disciplina / Deporte</label>
                      <select name="deporte_disciplina" value={formClinico.deporte_disciplina} onChange={handleFormChange} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="Gimnasio">Gimnasio</option><option value="Funcional">Funcional</option><option value="Calistenia">Calistenia</option><option value="Barre">Barré</option><option value="Pilates">Pilates</option><option value="Natacion">Natación</option><option value="Bicicleta">Bicicleta</option><option value="Indoor Cycling">Indoor Cycling</option><option value="Crossfit">Crossfit</option><option value="Box">Box</option><option value="MMA">MMA</option><option value="Cardio">Cardio</option>
                        <option value="Carrera_5k">Carrera - 5 km</option><option value="Carrera_8k">Carrera - 8 km</option><option value="Carrera_10k">Carrera - 10 km</option><option value="Carrera_12k">Carrera - 12 km</option><option value="Carrera_15k">Carrera - 15 km</option><option value="Carrera_20k">Carrera - 20 km</option><option value="Carrera_21k">Carrera - Medio Maratón (21k+)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {seccionActiva === 'enfoque' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">Enfoque Nutricional</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Enfoque Nutricional</label><select name="enfoque" value={formClinico.enfoque} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"><option value="Deficit Calorico Ligero">Déficit Calórico Ligero</option><option value="Deficit Calorico Moderado">Déficit Calórico Moderado</option><option value="Deficit Calorico Estricto">Déficit Calórico Estricto</option><option value="Mantenimiento">Mantenimiento</option><option value="Superavit">Superávit</option></select></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Aporte Calórico Sugerido (kcal)</label><input type="number" name="aporte_calorico" value={formClinico.aporte_calorico} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-teal-700 outline-none focus:ring-2 focus:ring-teal-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Tiempos de comida al día</label><select name="tiempos_comida" value={formClinico.tiempos_comida} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7 o más</option></select></div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 grid grid-cols-3 gap-4 shadow-sm">
                  <p className="col-span-full font-bold text-sm text-slate-700">Distribución de Macronutrientes (%)</p>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Carbohidratos</label><input type="number" name="pct_carbohidratos" value={formClinico.pct_carbohidratos} onChange={handleFormChange} placeholder="%" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500 text-center"/></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Proteínas</label><input type="number" name="pct_proteinas" value={formClinico.pct_proteinas} onChange={handleFormChange} placeholder="%" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500 text-center"/></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Grasas</label><input type="number" name="pct_grasas" value={formClinico.pct_grasas} onChange={handleFormChange} placeholder="%" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500 text-center"/></div>
                </div>

                <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prescripción de Suplementación Específica</label><textarea name="notas_suplementos_recetados" value={formClinico.notas_suplementos_recetados} onChange={handleFormChange} placeholder="Dosis y marcas de suplementos indicados..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" rows={3}/></div>
              </div>
            )}

          </div>
        </div>
      </main>
    )
  }

  // ==============================================================================
  // VISTA 2: MODAL DE CIERRE (SOLO MARLA LO VE, ELLA RECETA PERO NO COBRA)
  // ==============================================================================
  if (showCheckout && esAdmin) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-8">
        <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden border border-slate-200/50 animate-in zoom-in-95 duration-200 max-h-[90vh]">
          
          <div className="w-full md:w-2/3 bg-white p-6 md:p-10 overflow-y-auto border-r border-slate-100 flex flex-col gap-8">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Cierre Médico</h2>
              <p className="text-sm text-slate-500 mb-6">Selecciona el tipo de servicio que realizaste hoy.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SERVICIOS.map(srv => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => handleServiceSelect(srv.id, srv.precio)}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-2 ${
                      checkout.tipo_consulta === srv.id ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <span className="text-2xl">{srv.icon}</span>
                    <div className="mt-1">
                      <p className={`text-xs font-bold leading-tight ${checkout.tipo_consulta === srv.id ? 'text-teal-900' : 'text-slate-700'}`}>{srv.label}</p>
                      <p className={`text-[11px] font-black mt-1 ${checkout.tipo_consulta === srv.id ? 'text-teal-700' : 'text-slate-400'}`}>${srv.precio}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#F5F5F7] p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <p className="text-base font-black text-slate-800">Recetar Suplementos</p>
                  <p className="text-xs text-slate-500 mt-0.5">Se sumarán a su cuenta en recepción.</p>
                </div>
                <button onClick={agregarRenglonProducto} type="button" className="text-xs bg-white text-slate-700 font-bold px-4 py-2 rounded-xl shadow-sm hover:shadow border border-slate-200">+ Agregar</button>
              </div>
              
              <div className="space-y-3">
                {productosVenta.map((prodId, idx) => (
                  <div key={idx} className="relative">
                    <select value={prodId} onChange={(e) => handleProductSelectChange(idx, e.target.value)} className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 appearance-none">
                      <option value="">-- Selecciona producto para recetar --</option>
                      {catalogo.map(p => {
                        const id_p = p.id_prod || p.ID_PROD; const nom = p.producto || p.PRODUCTO; const pre = p.precio_venta || p.PRECIO_VENTA || 0;
                        return <option key={id_p} value={id_p}>{nom} — ${pre}</option>
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">📅 Agendar Próxima Cita</p>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" name="proxima_fecha" value={checkout.proxima_fecha} onChange={handleCheckoutChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none"/>
                <input type="time" name="proxima_hora" value={checkout.proxima_hora} onChange={handleCheckoutChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none"/>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/3 bg-[#F5F5F7] flex flex-col justify-between p-6 md:p-10">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Resumen de Cuenta</p>
              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-slate-500 font-medium">Servicios</span><span className="font-bold">${subtotalConsulta.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-slate-500 font-medium">Suplementos</span><span className="font-bold">${subtotalProductos.toFixed(2)}</span>
              </div>
              <div className="flex gap-2 mb-4">
                <select name="tipo_descuento" value={checkout.tipo_descuento} onChange={handleCheckoutChange} className="bg-white border border-slate-200 rounded-xl text-xs p-2.5 font-bold">
                  <option value="Ninguno">Sin Descuento</option><option value="Porcentaje">Desc. (%)</option><option value="Fijo">Desc. ($)</option>
                </select>
                {checkout.tipo_descuento !== 'Ninguno' && (
                  <input type="number" name="valor_descuento" value={checkout.valor_descuento} onChange={handleCheckoutChange} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 text-right font-black"/>
                )}
              </div>
              <div className="flex justify-between items-end border-t border-slate-200 pt-5 mt-5">
                <span className="text-sm font-black text-slate-800">TOTAL</span>
                <span className="text-3xl font-black text-slate-900">${totalAPagar.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button onClick={mandarARecepcion} className="w-full py-4 rounded-2xl text-sm font-black bg-slate-900 text-white hover:bg-teal-600 transition-all shadow-md text-center">
                Mandar a Recepción (Caja) 📤
              </button>
              <button onClick={() => { setShowCheckout(false); setModoConsulta(true); }} className="w-full py-4 bg-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-300 transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==============================================================================
  // VISTA 3: PANTALLA PRINCIPAL DEL PACIENTE (HISTORIAL)
  // ==============================================================================
  return (
    <main className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6 md:p-10">
      {showEditPaciente && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8">
            <h3 className="text-xl font-black text-slate-800 mb-2">Editar Perfil</h3>
            <div className="space-y-4 mb-8">
              <input type="text" name="nombre_completo" value={editForm.nombre_completo} onChange={handleEditFormChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm" placeholder="Nombre completo"/>
              <input type="text" name="telefono" value={editForm.telefono} onChange={handleEditFormChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm" placeholder="Teléfono"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowEditPaciente(false)} className="px-5 py-3.5 bg-slate-100 rounded-xl text-xs font-bold">Cancelar</button>
              <button onClick={guardarEdicionPaciente} className="flex-1 bg-slate-900 text-white rounded-xl text-xs font-black">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
          <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2"><span className="text-lg">&larr;</span> Directorio</Link>
          
          {/* BOTON MÁGICO: DEPENDE DE QUIÉN ESTÁ USANDO LA APP */}
          {esAdmin ? (
            <button onClick={iniciarConsulta} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-teal-600 transition-all flex items-center gap-2">
              <span>🩺</span> {visitaEnEspera ? 'Paciente Esperando - Iniciar Consulta' : 'Nueva Consulta Directa'}
            </button>
          ) : (
            <button onClick={hacerCheckIn} disabled={!!visitaEnEspera} className={`px-6 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 ${visitaEnEspera ? 'bg-slate-200 text-slate-400' : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md'}`}>
              <span>🛋️</span> {visitaEnEspera ? 'Ya está en sala de espera' : 'Anunciar Llegada (Check-In)'}
            </button>
          )}

        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{paciente.nombre_completo || paciente.Nombre_Completo}</h2>
              <button onClick={abrirEdicionPaciente} className="mt-2 text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1 font-bold bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">✏️ Editar Perfil</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div><p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Teléfono</p><p className="font-bold text-slate-800">{paciente.telefono || paciente.Telefono || 'N/A'}</p></div>
          </div>
        </div>

        {!esPrimeraVez && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <h3 className="text-base font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-2"><span>📋</span> Historial Clínico</h3>
            <div className="space-y-5">
              {transaccionesReales.map((t, idx) => (
                <div key={idx} className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm flex flex-col md:flex-row p-6">
                   <div className="flex-1">
                     <p className="text-[11px] font-black text-teal-600 uppercase mb-1">{t.concepto_historico || t.es_consulta}</p>
                     <p className="text-xl font-black text-slate-800">{formatearFechaDisplay(t.fecha || t.Fecha)}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Total de cuenta:</p>
                     <p className="text-2xl font-black text-slate-900">${t.monto_cobrado || t.Monto_Cobrado}</p>
                     <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Pago: {t.metodo_pago || t.Metodo_Pago}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
