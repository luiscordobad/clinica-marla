"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { obtenerEstadoSesion, type SesionActual } from '../../../lib/auth'
import type { Cita, Consulta, Paciente, Pago, PagoProducto, Producto } from '../../../lib/types'
import Link from 'next/link'

const ETIQUETAS_ANTECEDENTES: Record<string, string> = {
  heredo_familiares: 'Antecedentes Heredo Familiares',
  patologicos: 'Antecedentes Personales Patológicos',
  cirugias: 'Cirugías',
  no_patologicos: 'Antecedentes Personales No Patológicos',
  laboratorios: 'Resultados de Laboratorios',
  medicamentos: 'Medicamentos',
  suplementos_actuales: 'Suplementos que tomaba',
  sueno: 'Patrón de Sueño',
  objetivos: 'Objetivos Clínicos / Estéticos',
}

const ETIQUETAS_MEDICIONES: Record<string, string> = {
  circ_abdominal: 'Circ. Abdominal (cm)',
  circ_umbilical: 'Circ. Umbilical (cm)',
  pecho: 'Pecho (cm)',
  gluteo: 'Glúteo (cm)',
  muslo: 'Muslo (cm)',
  bicep_izq_reposo: 'Bicep Izq (Reposo/Flex)',
  bicep_der_reposo: 'Bicep Der (Reposo/Flex)',
}

const ETIQUETAS_INBODY: Record<string, string> = {
  peso_kg: 'Peso Total (kg)',
  musculo_esqu_kg: 'Masa Muscular Esquelética (kg)',
  masa_grasa_kg: 'Masa Grasa Corporal (kg)',
  grasa_pct: 'Porcentaje de Grasa (%)',
  grasa_visceral: 'Grasa Visceral (Nivel)',
  tmb_kcal: 'TMB (kcal)',
  agua_total_lt: 'Agua Corporal Total (Lts)',
  peso_ideal_kg: 'Peso Ideal Configurado (kg)',
  grasa_bajar_kg: 'Grasa a bajar (kg)',
  musculo_subir_kg: 'Músculo a subir (kg)',
}

const ETIQUETAS_ESTILO_VIDA: Record<string, string> = {
  alergias_intolerancias: 'Alergias o Intolerancias',
  agua_diaria: 'Consumo de Agua Diario',
  ansiedad: 'Ansiedad / Estrés',
  restricciones_alimentarias: 'Restricciones Alimentarias',
  alcohol: 'Alcohol',
  cigarro: 'Cigarro',
  vape: 'Vape',
  drogas: 'Drogas',
  recordatorio_24h: 'Recordatorio de 24 Horas',
  alimentos_mas_consumidos: 'Alimentos más consumidos',
  alimentos_menos_consumidos: 'Alimentos menos consumidos',
  actividad_fisica_freq: 'Actividad Física — Frecuencia',
  actividad_fisica_duracion: 'Actividad Física — Duración',
  actividad_fisica_intensidad: 'Actividad Física — Intensidad',
  deporte_disciplina: 'Disciplina / Deporte',
}

const ETIQUETAS_ENFOQUE: Record<string, string> = {
  enfoque: 'Enfoque Nutricional',
  aporte_calorico: 'Aporte Calórico Sugerido (kcal)',
  tiempos_comida: 'Tiempos de comida al día',
  pct_carbohidratos: 'Carbohidratos (%)',
  pct_proteinas: 'Proteínas (%)',
  pct_grasas: 'Grasas (%)',
  notas_suplementos_recetados: 'Suplementación Recetada',
}

function CamposDetalle({ datos, etiquetas }: { datos: Record<string, any> | null | undefined; etiquetas: Record<string, string> }) {
  if (!datos) return null
  const entradas = Object.entries(etiquetas).filter(([clave]) => datos[clave] !== undefined && datos[clave] !== null && String(datos[clave]).trim() !== '')
  if (entradas.length === 0) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {entradas.map(([clave, etiqueta]) => (
        <div key={clave}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{etiqueta}</p>
          <p className="text-sm font-bold text-slate-700">{String(datos[clave])}</p>
        </div>
      ))}
    </div>
  )
}

function SeccionDetalle({ titulo, icono, children }: { titulo: string; icono: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
      <p className="text-xs font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">{icono} {titulo}</p>
      {children}
    </div>
  )
}

const SERVICIOS = [
  { id: 'Primera Vez', label: 'Primera Vez', precio: '1000', icon: '🌟' },
  { id: 'Subsecuente', label: 'Subsecuente', precio: '800', icon: '🔄' },
  { id: 'Medica', label: 'Médica', precio: '800', icon: '🩺' },
  { id: 'En Linea', label: 'En Línea', precio: '700', icon: '💻' },
  { id: 'InBody', label: 'Solo InBody', precio: '500', icon: '⚖️' },
  { id: 'Enzimas', label: 'Enzimas', precio: '4500', icon: '💉' },
  { id: 'Solo Suplementos', label: 'Suplementos', precio: '0', icon: '🛍️' },
]

const FORM_CLINICO_VACIO = {
  heredo_familiares: '', patologicos: '', cirugias: '', no_patologicos: '',
  laboratorios: '', medicamentos: '', suplementos_actuales: '', sueno: '', objetivos: '',
  circ_abdominal: '', circ_umbilical: '', bicep_izq_reposo: '', bicep_der_reposo: '',
  gluteo: '', muslo: '', pecho: '',
  p_abdominal: '', p_triceps: '', p_biceps: '', p_subescapular: '', p_suprailiaco: '', p_muslo: '', p_pantorrilla: '', p_pectoral: '', p_medio_axilar: '',
  peso_kg: '', musculo_esqu_kg: '', masa_grasa_kg: '', grasa_pct: '', grasa_visceral: '',
  tmb_kcal: '', agua_total_lt: '', peso_ideal_kg: '', grasa_bajar_kg: '', musculo_subir_kg: '',
  alergias_intolerancias: '', alcohol: 'No', cigarro: 'No', vape: 'No', drogas: 'No', agua_diaria: '', ansiedad: 'No',
  recordatorio_24h: '', restricciones_alimentarias: '', alimentos_mas_consumidos: '', alimentos_menos_consumidos: '',
  actividad_fisica_freq: '', actividad_fisica_duracion: '', actividad_fisica_intensidad: 'Moderada',
  deporte_disciplina: 'Gimnasio',
  enfoque: 'Deficit Calorico Ligero', aporte_calorico: '', tiempos_comida: '3',
  pct_carbohidratos: '', pct_proteinas: '', pct_grasas: '', notas_suplementos_recetados: '',
  notas_seguimiento_general: '',
}

export default function ExpedientePaciente({ params }: { params: { id: string } }) {
  const [sesion, setSesion] = useState<SesionActual | null>(null)

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [citasPaciente, setCitasPaciente] = useState<Cita[]>([])
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [pagosPaciente, setPagosPaciente] = useState<Pago[]>([])
  const [pagoProductosPaciente, setPagoProductosPaciente] = useState<PagoProducto[]>([])
  const [catalogo, setCatalogo] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [consultaExpandida, setConsultaExpandida] = useState<string | null>(null)

  const [modoConsulta, setModoConsulta] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [seccionActiva, setSeccionActiva] = useState('antecedentes')
  const [realizarPlicometria, setRealizarPlicometria] = useState<'Si' | 'No'>('No')
  const [plicometriaValores, setPlicometriaValores] = useState<Record<string, string>>({})

  const [showEditPaciente, setShowEditPaciente] = useState(false)
  const [editForm, setEditForm] = useState({ nombre_completo: '', fecha_nacimiento: '', telefono: '', correo: '' })

  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' | 'advertencia' } | null>(null)
  const mostrarToast = (mensaje: string, tipo: 'exito' | 'error' | 'advertencia') => { setToast({ mensaje, tipo }); setTimeout(() => setToast(null), 4000) }

  const [formClinico, setFormClinico] = useState(FORM_CLINICO_VACIO)

  const [checkout, setCheckout] = useState({
    concepto: '', precio: '', tipo_descuento: 'Ninguno', valor_descuento: '',
    proxima_fecha: '', proxima_hora: '',
  })
  const [productosVenta, setProductosVenta] = useState<string[]>([''])

  const hoyStr = new Date().toISOString().split('T')[0]
  const esFullAccess = sesion?.esFullAccess ?? false
  const esPrimeraVez = consultas.length === 0
  const citaHoyEnEspera = citasPaciente.find(c => c.estado === 'en_espera' && c.fecha_cita === hoyStr)
  const citaHoyProgramada = citasPaciente.find(c => c.estado === 'programada' && c.fecha_cita === hoyStr)
  const ultimaConsulta = consultas[0]

  const formatearFechaDisplay = (val: string) => {
    const d = new Date(val)
    if (isNaN(d.getTime())) return 'Fecha sin registro'
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${d.getDate()} de ${meses[d.getMonth()]} del ${d.getFullYear()}`
  }

  useEffect(() => {
    const iniciar = async () => {
      const estado = await obtenerEstadoSesion()
      if (estado.tipo !== 'activa') { window.location.href = '/login'; return }
      setSesion(estado.sesion)
      await cargarDatos(estado.sesion.esFullAccess)
    }
    iniciar()
  }, [params.id])

  const cargarDatos = async (esFull: boolean) => {
    const { data: pData } = await supabase.from('pacientes').select('*').eq('id', params.id).single()
    if (pData) setPaciente(pData as Paciente)

    const { data: cData } = await supabase.from('citas').select('*').eq('paciente_id', params.id).order('fecha_cita', { ascending: false })
    if (cData) setCitasPaciente(cData as Cita[])

    const { data: payData } = await supabase.from('pagos').select('*').eq('paciente_id', params.id).order('fecha', { ascending: false })
    if (payData) setPagosPaciente(payData as Pago[])

    if (esFull) {
      const { data: conData } = await supabase.from('consultas').select('*').eq('paciente_id', params.id).order('fecha', { ascending: false })
      if (conData) setConsultas(conData as Consulta[])

      const { data: invData } = await supabase.from('inventario').select('*').order('producto', { ascending: true })
      if (invData) setCatalogo(invData as Producto[])

      if (payData && payData.length > 0) {
        const { data: ppData } = await supabase.from('pago_productos').select('*').in('pago_id', payData.map(p => p.id))
        if (ppData) setPagoProductosPaciente(ppData as PagoProducto[])
      }
    }

    setLoading(false)
  }

  const abrirEdicionPaciente = () => {
    if (!paciente) return
    setEditForm({
      nombre_completo: paciente.nombre_completo || '',
      fecha_nacimiento: paciente.fecha_nacimiento || '',
      telefono: paciente.telefono || '',
      correo: paciente.correo || '',
    })
    setShowEditPaciente(true)
  }

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const guardarEdicionPaciente = async () => {
    if (!paciente) return
    const { error } = await supabase.from('pacientes').update(editForm).eq('id', paciente.id)
    if (!error) { await cargarDatos(esFullAccess); setShowEditPaciente(false) } else mostrarToast('Error actualizando perfil: ' + error.message, 'error')
  }

  // =======================================================
  // PERSONAL ADMINISTRATIVO: CHECK-IN
  // =======================================================
  const hacerCheckIn = async () => {
    if (!paciente || !sesion) return
    if (citaHoyProgramada) {
      const { error } = await supabase.from('citas').update({ estado: 'en_espera' }).eq('id', citaHoyProgramada.id)
      if (error) return mostrarToast('Error en el Check-In: ' + error.message, 'error')
    } else {
      const ahora = new Date()
      const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
      // Nota: el personal administrativo no tiene acceso al expediente clínico (RLS),
      // así que no puede saber con certeza si es primera vez. Se registra como
      // "seguimiento" por defecto; Marla ajusta el tipo real al hacer la consulta.
      const { error } = await supabase.from('citas').insert([{
        paciente_id: paciente.id,
        nombre_paciente: paciente.nombre_completo,
        fecha_cita: hoyStr,
        hora_cita: hora,
        duracion_min: 30,
        tipo: 'seguimiento',
        estado: 'en_espera',
        created_by: sesion.usuario.id,
      }])
      if (error) return mostrarToast('Error en el Check-In: ' + error.message, 'error')
    }
    await cargarDatos(esFullAccess)
    mostrarToast('Paciente registrado en Sala de Espera.', 'exito')
  }

  // =======================================================
  // NUTRIÓLOGA: CONSULTA Y CIERRE
  // =======================================================
  const iniciarConsulta = () => {
    setSeccionActiva(esPrimeraVez ? 'antecedentes' : 'seguimiento_notas')
    setModoConsulta(true)
  }

  const abrirCheckout = () => {
    setModoConsulta(false)
    setShowCheckout(true)
    if (!checkout.concepto) {
      const base = esPrimeraVez ? SERVICIOS[0] : SERVICIOS[1]
      setCheckout(prev => ({ ...prev, concepto: base.id, precio: base.precio }))
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormClinico({ ...formClinico, [e.target.name]: e.target.value })
  }

  const handlePlicometriaChange = (sitio: string, val: string) => setPlicometriaValores({ ...plicometriaValores, [sitio]: val })

  const handleCheckoutChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCheckout({ ...checkout, [e.target.name]: e.target.value })
  }

  const handleServiceSelect = (id: string, precio: string) => setCheckout(prev => ({ ...prev, concepto: id, precio }))

  const handleProductSelectChange = (index: number, val: string) => {
    const copia = [...productosVenta]; copia[index] = val; setProductosVenta(copia)
  }

  const agregarRenglonProducto = () => { if (productosVenta.length < 6) setProductosVenta([...productosVenta, '']) }

  const subtotalConsulta = Number(checkout.precio) || 0
  const subtotalProductos = productosVenta.reduce((acc, pId) => {
    const prod = catalogo.find(item => item.id === pId)
    return acc + (prod ? prod.precio_venta : 0)
  }, 0)
  const subtotalGeneral = subtotalConsulta + subtotalProductos

  let descuentoAplicado = 0
  if (checkout.tipo_descuento === 'Porcentaje') descuentoAplicado = subtotalGeneral * ((Number(checkout.valor_descuento) || 0) / 100)
  else if (checkout.tipo_descuento === 'Fijo') descuentoAplicado = Number(checkout.valor_descuento) || 0
  const totalAPagar = Math.max(0, subtotalGeneral - descuentoAplicado)

  const mandarARecepcion = async () => {
    if (!paciente || !sesion) return
    const productosLimpios = productosVenta.filter(p => p !== '')

    const antecedentes = esPrimeraVez ? {
      heredo_familiares: formClinico.heredo_familiares, patologicos: formClinico.patologicos, cirugias: formClinico.cirugias,
      no_patologicos: formClinico.no_patologicos, laboratorios: formClinico.laboratorios, medicamentos: formClinico.medicamentos,
      suplementos_actuales: formClinico.suplementos_actuales, sueno: formClinico.sueno, objetivos: formClinico.objetivos,
    } : {}

    const mediciones = {
      circ_abdominal: formClinico.circ_abdominal, circ_umbilical: formClinico.circ_umbilical, pecho: formClinico.pecho,
      gluteo: formClinico.gluteo, muslo: formClinico.muslo, bicep_izq_reposo: formClinico.bicep_izq_reposo, bicep_der_reposo: formClinico.bicep_der_reposo,
      realizar_plicometria: realizarPlicometria, plicometria: realizarPlicometria === 'Si' ? plicometriaValores : {},
    }

    const inbody = {
      peso_kg: formClinico.peso_kg, musculo_esqu_kg: formClinico.musculo_esqu_kg, masa_grasa_kg: formClinico.masa_grasa_kg,
      grasa_pct: formClinico.grasa_pct, grasa_visceral: formClinico.grasa_visceral, tmb_kcal: formClinico.tmb_kcal,
      agua_total_lt: formClinico.agua_total_lt, peso_ideal_kg: formClinico.peso_ideal_kg, grasa_bajar_kg: formClinico.grasa_bajar_kg,
      musculo_subir_kg: formClinico.musculo_subir_kg,
    }

    const estilo_vida = esPrimeraVez ? {
      alergias_intolerancias: formClinico.alergias_intolerancias, agua_diaria: formClinico.agua_diaria, ansiedad: formClinico.ansiedad,
      restricciones_alimentarias: formClinico.restricciones_alimentarias, alcohol: formClinico.alcohol, cigarro: formClinico.cigarro,
      vape: formClinico.vape, drogas: formClinico.drogas, recordatorio_24h: formClinico.recordatorio_24h,
      alimentos_mas_consumidos: formClinico.alimentos_mas_consumidos, alimentos_menos_consumidos: formClinico.alimentos_menos_consumidos,
      actividad_fisica_freq: formClinico.actividad_fisica_freq, actividad_fisica_duracion: formClinico.actividad_fisica_duracion,
      actividad_fisica_intensidad: formClinico.actividad_fisica_intensidad, deporte_disciplina: formClinico.deporte_disciplina,
    } : {}

    const enfoque_nutricional = {
      enfoque: formClinico.enfoque, aporte_calorico: formClinico.aporte_calorico, tiempos_comida: formClinico.tiempos_comida,
      pct_carbohidratos: formClinico.pct_carbohidratos, pct_proteinas: formClinico.pct_proteinas, pct_grasas: formClinico.pct_grasas,
      notas_suplementos_recetados: formClinico.notas_suplementos_recetados,
    }

    const citaAsociada = citaHoyEnEspera || null

    const { data: consultaCreada, error: errConsulta } = await supabase.from('consultas').insert([{
      paciente_id: paciente.id,
      cita_id: citaAsociada?.id ?? null,
      tipo: esPrimeraVez ? 'primera_vez' : 'seguimiento',
      realizada_por: sesion.usuario.id,
      antecedentes, mediciones, inbody, estilo_vida, enfoque_nutricional,
      notas_evolucion: esPrimeraVez ? 'Consulta Inicial' : formClinico.notas_seguimiento_general,
      peso_actual: formClinico.peso_kg ? parseFloat(formClinico.peso_kg) : null,
      porcentaje_grasa: formClinico.grasa_pct ? parseFloat(formClinico.grasa_pct) : null,
      musculo_kg: formClinico.musculo_esqu_kg ? parseFloat(formClinico.musculo_esqu_kg) : null,
    }]).select('id').single()

    if (errConsulta || !consultaCreada) return mostrarToast('Error guardando el expediente: ' + errConsulta?.message, 'error')

    const { data: pagoCreado, error: errPago } = await supabase.from('pagos').insert([{
      paciente_id: paciente.id,
      cita_id: citaAsociada?.id ?? null,
      consulta_id: consultaCreada.id,
      concepto: checkout.concepto,
      monto_esperado: totalAPagar,
      estado: 'pendiente_pago',
      descuento_tipo: checkout.tipo_descuento.toLowerCase() === 'ninguno' ? 'ninguno' : checkout.tipo_descuento.toLowerCase(),
      descuento_valor: Number(checkout.valor_descuento) || 0,
      created_by: sesion.usuario.id,
    }]).select('id').single()

    if (errPago || !pagoCreado) return mostrarToast('Error enviando a caja: ' + errPago?.message, 'error')

    if (productosLimpios.length > 0) {
      await supabase.from('pago_productos').insert(productosLimpios.map(pId => {
        const prod = catalogo.find(p => p.id === pId)
        return { pago_id: pagoCreado.id, producto_id: pId, cantidad: 1, precio_unit: prod?.precio_venta || 0 }
      }))
    }

    if (citaAsociada) await supabase.from('citas').update({ estado: 'completada' }).eq('id', citaAsociada.id)

    if (checkout.proxima_fecha && checkout.proxima_hora) {
      await supabase.from('citas').insert([{
        paciente_id: paciente.id,
        nombre_paciente: paciente.nombre_completo,
        fecha_cita: checkout.proxima_fecha,
        hora_cita: checkout.proxima_hora,
        duracion_min: 30,
        tipo: 'seguimiento',
        estado: 'programada',
        created_by: sesion.usuario.id,
      }])
    }

    await cargarDatos(esFullAccess)
    setShowCheckout(false); setModoConsulta(false); setProductosVenta([''])
    setFormClinico(FORM_CLINICO_VACIO); setPlicometriaValores({}); setRealizarPlicometria('No')
    mostrarToast('¡Listo! El paciente fue enviado a recepción para el cobro.', 'exito')
  }

  if (loading || !sesion) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><p className="animate-pulse font-bold text-slate-400">Cargando expediente...</p></div>
  if (!paciente) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><Link href="/" className="text-teal-600 font-bold hover:underline">Volver</Link></div>

  // ==============================================================================
  // VISTA 1: WIZARD CLÍNICO (SOLO ACCESO TOTAL)
  // ==============================================================================
  if (modoConsulta && esFullAccess) {
    return (
      <main className="min-h-screen bg-[#F5F5F7] flex flex-col lg:flex-row">
        <div className="w-full lg:w-72 bg-slate-900 text-slate-300 flex flex-col sticky top-0 lg:h-screen z-20">
          <div className="p-5 bg-slate-950 border-b border-slate-800">
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mb-1.5 ${esPrimeraVez ? 'bg-amber-500 text-amber-950' : 'bg-teal-500 text-teal-950'}`}>
              {esPrimeraVez ? 'Estudio de Primera Vez' : 'Control de Seguimiento'}
            </span>
            <h2 className="text-white font-black text-md truncate">{paciente.nombre_completo}</h2>
          </div>
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto p-3 gap-1 flex-1">
            {esPrimeraVez ? (
              [
                { id: 'antecedentes', label: '1. Antecedentes', icon: '📝' },
                { id: 'mediciones', label: '2. Talla y Mediciones', icon: '📏' },
                { id: 'peso', label: '3. Peso e InBody', icon: '⚖️' },
                { id: 'estilo', label: '4. Estilo de Vida', icon: '🥗' },
                { id: 'enfoque', label: '5. Enfoque Nutricional', icon: '🎯' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setSeccionActiva(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left whitespace-nowrap transition-all ${seccionActiva === tab.id ? 'bg-teal-600 text-white shadow-md' : 'hover:bg-slate-800'}`}>
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))
            ) : (
              [
                { id: 'seguimiento_notas', label: '1. Notas de Evolución', icon: '🗣️' },
                { id: 'mediciones', label: '2. Control Corporal', icon: '⚖️' },
                { id: 'enfoque', label: '3. Ajuste de Plan', icon: '🔄' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setSeccionActiva(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left whitespace-nowrap transition-all ${seccionActiva === tab.id ? 'bg-teal-600 text-white shadow-md' : 'hover:bg-slate-800'}`}>
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))
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
                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Antecedentes Heredo Familiares</label><textarea name="heredo_familiares" value={formClinico.heredo_familiares} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Antecedentes Personales Patológicos</label><textarea name="patologicos" value={formClinico.patologicos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Cirugías</label><textarea name="cirugias" value={formClinico.cirugias} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2} /></div>
                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Antecedentes Personales No Patológicos</label><textarea name="no_patologicos" value={formClinico.no_patologicos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Resultados de Laboratorios</label><input type="text" name="laboratorios" value={formClinico.laboratorios} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Medicamentos</label><input type="text" name="medicamentos" value={formClinico.medicamentos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Suplementos que toma actualmente</label><input type="text" name="suplementos_actuales" value={formClinico.suplementos_actuales} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Patrón de Sueño</label><input type="text" name="sueno" value={formClinico.sueno} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" placeholder="Horas, calidad del descanso..." /></div>
                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Objetivos Clínicos / Estéticos</label><input type="text" name="objetivos" value={formClinico.objetivos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" /></div>
                </div>
              </div>
            )}

            {seccionActiva === 'seguimiento_notas' && !esPrimeraVez && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">1. Seguimiento Clínico</h3>
                <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 text-sm text-sky-900 font-medium shadow-sm">
                  <span className="font-bold block mb-1">Evolución previa:</span> {ultimaConsulta?.notas_evolucion || 'Sin anotaciones previas.'}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Notas de evolución actuales (apego, síntomas, cambios)</label>
                  <textarea name="notas_seguimiento_general" value={formClinico.notas_seguimiento_general} onChange={handleFormChange} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all min-h-[160px] shadow-sm" placeholder="Escribe aquí los comentarios de la sesión..." />
                </div>
              </div>
            )}

            {seccionActiva === 'mediciones' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">2. Antropometría y Mediciones</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Circ. Abdominal (cm)</label><input type="number" name="circ_abdominal" value={formClinico.circ_abdominal} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Circ. Umbilical (cm)</label><input type="number" name="circ_umbilical" value={formClinico.circ_umbilical} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Pecho (cm)</label><input type="number" name="pecho" value={formClinico.pecho} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Glúteo (cm)</label><input type="number" name="gluteo" value={formClinico.gluteo} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Muslo (cm)</label><input type="number" name="muslo" value={formClinico.muslo} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>

                  <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1">Bicep Izq (Reposo/Flex)</label><input type="text" name="bicep_izq_reposo" value={formClinico.bicep_izq_reposo} onChange={handleFormChange} placeholder="Ej. 32 / 35" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                  <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-1">Bicep Der (Reposo/Flex)</label><input type="text" name="bicep_der_reposo" value={formClinico.bicep_der_reposo} onChange={handleFormChange} placeholder="Ej. 32.5 / 35.2" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 mt-6 shadow-sm">
                  <div className="flex justify-between items-center"><label className="text-sm font-bold text-slate-700">¿Realizar Plicometría de Pliegues?</label><select value={realizarPlicometria} onChange={(e) => setRealizarPlicometria(e.target.value as 'Si' | 'No')} className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"><option value="No">No</option><option value="Si">Sí</option></select></div>

                  {realizarPlicometria === 'Si' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-200">
                      {['Abdominal', 'Triceps', 'Biceps', 'Subescapular', 'Suprailiaco', 'Muslo', 'Pantorrilla', 'Pectoral', 'Medio_Axilar'].map(p => (
                        <div key={p}><label className="block text-[11px] font-medium text-slate-500 mb-1.5 ml-1">Pliegue {p.replace('_', ' ')} (mm)</label><input type="number" value={plicometriaValores[p] || ''} onChange={(e) => handlePlicometriaChange(p, e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
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
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Peso Total Actual (kg)</label><input type="number" step="0.1" name="peso_kg" value={formClinico.peso_kg} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Masa Muscular Esquelética (kg)</label><input type="number" step="0.1" name="musculo_esqu_kg" value={formClinico.musculo_esqu_kg} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Masa Grasa Corporal (kg)</label><input type="number" step="0.1" name="masa_grasa_kg" value={formClinico.masa_grasa_kg} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Porcentaje de Grasa (%)</label><input type="number" step="0.1" name="grasa_pct" value={formClinico.grasa_pct} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-red-500 outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Grasa Visceral (Nivel)</label><input type="number" name="grasa_visceral" value={formClinico.grasa_visceral} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">TMB (kcal)</label><input type="number" name="tmb_kcal" value={formClinico.tmb_kcal} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Agua Corporal Total (Lts)</label><input type="number" step="0.1" name="agua_total_lt" value={formClinico.agua_total_lt} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Peso Ideal Configurado (kg)</label><input type="number" step="0.1" name="peso_ideal_kg" value={formClinico.peso_ideal_kg} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-red-600 mb-1.5 ml-1">Grasa a bajar (kg)</label><input type="number" step="0.1" name="grasa_bajar_kg" value={formClinico.grasa_bajar_kg} onChange={handleFormChange} className="w-full p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" /></div>
                  <div><label className="block text-xs font-bold text-teal-600 mb-1.5 ml-1">Músculo a subir (kg)</label><input type="number" step="0.1" name="musculo_subir_kg" value={formClinico.musculo_subir_kg} onChange={handleFormChange} className="w-full p-4 bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" /></div>
                </div>
              </div>
            )}

            {seccionActiva === 'estilo' && esPrimeraVez && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">4. Alimentación y Estilo de Vida</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Alergias o Intolerancias</label><input type="text" name="alergias_intolerancias" value={formClinico.alergias_intolerancias} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Consumo de Agua Diario</label><input type="text" name="agua_diaria" value={formClinico.agua_diaria} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Ansiedad / Estrés</label><select name="ansiedad" value={formClinico.ansiedad} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"><option value="No">No presenta</option><option value="Leve">Leve</option><option value="Moderada">Moderada</option><option value="Alta">Alta</option></select></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Restricciones Alimentarias</label><input type="text" name="restricciones_alimentarias" value={formClinico.restricciones_alimentarias} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>

                  <div className="flex gap-4 text-xs font-bold bg-slate-50 border border-slate-200 p-4 rounded-3xl col-span-full justify-between items-center shadow-sm">
                    {[{ k: 'alcohol', l: 'Alcohol' }, { k: 'cigarro', l: 'Cigarro' }, { k: 'vape', l: 'Vape' }, { k: 'drogas', l: 'Drogas' }].map(h => (
                      <div key={h.k} className="flex flex-col items-center w-full"><span className="text-slate-500 mb-2">{h.l}</span><select name={h.k} value={(formClinico as any)[h.k]} onChange={handleFormChange} className="p-2.5 bg-white border border-slate-200 rounded-xl w-full text-center outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"><option value="No">No</option><option value="Social">Social</option><option value="Frecuente">Frecuente</option></select></div>
                    ))}
                  </div>

                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Recordatorio de 24 Horas (Alimentación diaria normal)</label><textarea name="recordatorio_24h" value={formClinico.recordatorio_24h} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" rows={3} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Alimentos más consumidos</label><input type="text" name="alimentos_mas_consumidos" value={formClinico.alimentos_mas_consumidos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Alimentos menos consumidos</label><input type="text" name="alimentos_menos_consumidos" value={formClinico.alimentos_menos_consumidos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>

                  <div className="col-span-full bg-slate-50 p-5 rounded-3xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
                    <p className="col-span-full font-bold text-sm text-slate-700">Actividad Física</p>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Frecuencia Semanal</label><input type="text" name="actividad_fisica_freq" value={formClinico.actividad_fisica_freq} onChange={handleFormChange} placeholder="Ej. 4 días" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Duración Sesión</label><input type="text" name="actividad_fisica_duracion" value={formClinico.actividad_fisica_duracion} onChange={handleFormChange} placeholder="Ej. 1 hora" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500" /></div>
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
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Aporte Calórico Sugerido (kcal)</label><input type="number" name="aporte_calorico" value={formClinico.aporte_calorico} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-teal-700 outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Tiempos de comida al día</label><select name="tiempos_comida" value={formClinico.tiempos_comida} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7 o más</option></select></div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 grid grid-cols-3 gap-4 shadow-sm">
                  <p className="col-span-full font-bold text-sm text-slate-700">Distribución de Macronutrientes (%)</p>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Carbohidratos</label><input type="number" name="pct_carbohidratos" value={formClinico.pct_carbohidratos} onChange={handleFormChange} placeholder="%" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500 text-center" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Proteínas</label><input type="number" name="pct_proteinas" value={formClinico.pct_proteinas} onChange={handleFormChange} placeholder="%" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500 text-center" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Grasas</label><input type="number" name="pct_grasas" value={formClinico.pct_grasas} onChange={handleFormChange} placeholder="%" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500 text-center" /></div>
                </div>

                <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prescripción de Suplementación Específica</label><textarea name="notas_suplementos_recetados" value={formClinico.notas_suplementos_recetados} onChange={handleFormChange} placeholder="Dosis y marcas de suplementos indicados..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" rows={3} /></div>
              </div>
            )}

          </div>
        </div>
      </main>
    )
  }

  // ==============================================================================
  // VISTA 2: MODAL DE CIERRE (SOLO ACCESO TOTAL)
  // ==============================================================================
  if (showCheckout && esFullAccess) {
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
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-2 ${checkout.concepto === srv.id ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}
                  >
                    <span className="text-2xl">{srv.icon}</span>
                    <div className="mt-1">
                      <p className={`text-xs font-bold leading-tight ${checkout.concepto === srv.id ? 'text-teal-900' : 'text-slate-700'}`}>{srv.label}</p>
                      <p className={`text-[11px] font-black mt-1 ${checkout.concepto === srv.id ? 'text-teal-700' : 'text-slate-400'}`}>${srv.precio}</p>
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
                      {catalogo.map(p => <option key={p.id} value={p.id}>{p.producto} — ${p.precio_venta}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">📅 Agendar Próxima Cita</p>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" name="proxima_fecha" value={checkout.proxima_fecha} onChange={handleCheckoutChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none" />
                <input type="time" name="proxima_hora" value={checkout.proxima_hora} onChange={handleCheckoutChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none" />
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
                  <input type="number" name="valor_descuento" value={checkout.valor_descuento} onChange={handleCheckoutChange} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 text-right font-black" />
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
              <button onClick={() => { setShowCheckout(false); setModoConsulta(true) }} className="w-full py-4 bg-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-300 transition-colors">Cancelar</button>
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
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className={`px-6 py-3.5 rounded-full shadow-xl font-bold text-sm text-white flex items-center gap-2 ${toast.tipo === 'exito' ? 'bg-[#00D084]' : toast.tipo === 'error' ? 'bg-rose-500' : 'bg-amber-500 text-slate-900'}`}>
            {toast.mensaje}
          </div>
        </div>
      )}

      {showEditPaciente && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8">
            <h3 className="text-xl font-black text-slate-800 mb-2">Editar Perfil</h3>
            <div className="space-y-4 mb-8">
              <input type="text" name="nombre_completo" value={editForm.nombre_completo} onChange={handleEditFormChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm" placeholder="Nombre completo" />
              <input type="text" name="telefono" value={editForm.telefono} onChange={handleEditFormChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm" placeholder="Teléfono" />
              <input type="email" name="correo" value={editForm.correo} onChange={handleEditFormChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm" placeholder="Correo" />
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

          <div className="flex gap-2">
            {!citaHoyEnEspera && (
              <button onClick={hacerCheckIn} className="px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100">
                <span>🛋️</span> <span className="hidden sm:inline">Anunciar Llegada</span> Check-In
              </button>
            )}
            {esFullAccess && (
              <button onClick={iniciarConsulta} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-teal-600 transition-all flex items-center gap-2">
                <span>🩺</span> {citaHoyEnEspera ? 'Paciente Esperando - Iniciar Consulta' : 'Nueva Consulta Directa'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{paciente.nombre_completo}</h2>
              <button onClick={abrirEdicionPaciente} className="mt-2 text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1 font-bold bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">✏️ Editar Perfil</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div><p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Teléfono</p><p className="font-bold text-slate-800">{paciente.telefono || 'N/A'}</p></div>
          </div>
        </div>

        {esFullAccess && !esPrimeraVez && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <h3 className="text-base font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-2"><span>📋</span> Historial Clínico</h3>
            <div className="space-y-5">
              {consultas.map((c) => {
                const pagoAsociado = pagosPaciente.find(p => p.consulta_id === c.id)
                const productosVendidos = pagoAsociado ? pagoProductosPaciente.filter(pp => pp.pago_id === pagoAsociado.id) : []
                const expandida = consultaExpandida === c.id
                return (
                  <div key={c.id} className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
                    <button onClick={() => setConsultaExpandida(expandida ? null : c.id)} className="w-full text-left flex flex-col md:flex-row p-6 gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex-1">
                        <p className="text-[11px] font-black text-teal-600 uppercase mb-1">{c.tipo === 'primera_vez' ? 'Consulta Inicial' : 'Consulta de Seguimiento'}</p>
                        <p className="text-xl font-black text-slate-800">{formatearFechaDisplay(c.fecha)}</p>
                        {c.notas_evolucion && <p className="text-sm text-slate-600 mt-3">{c.notas_evolucion}</p>}
                        {(c.peso_actual || c.porcentaje_grasa) && (
                          <p className="text-xs font-bold text-slate-500 mt-3">⚖️ {c.peso_actual ? `${c.peso_actual} kg` : ''} {c.porcentaje_grasa ? `• ${c.porcentaje_grasa}% grasa` : ''}</p>
                        )}
                        <p className="text-xs font-bold text-teal-600 mt-3">{expandida ? '▾ Ocultar detalle' : '▸ Ver detalle completo'}</p>
                      </div>
                      {pagoAsociado && (
                        <div className="md:w-48 md:border-l md:pl-4 border-slate-100 shrink-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0 md:mt-4">Total de cuenta:</p>
                          <p className="text-2xl font-black text-slate-900">${pagoAsociado.monto_esperado}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{pagoAsociado.estado === 'pagado' ? 'Pagado' : 'Pendiente de pago'}</p>
                        </div>
                      )}
                    </button>

                    {expandida && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                        {pagoAsociado && (
                          <SeccionDetalle titulo="Cobro" icono="💳">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mb-3">
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Concepto</p><p className="text-sm font-bold text-slate-700">{pagoAsociado.concepto || '—'}</p></div>
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efectivo</p><p className="text-sm font-bold text-slate-700">${pagoAsociado.monto_efectivo}</p></div>
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarjeta</p><p className="text-sm font-bold text-slate-700">${pagoAsociado.monto_tarjeta}</p></div>
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transferencia</p><p className="text-sm font-bold text-slate-700">${pagoAsociado.monto_transferencia}</p></div>
                              {pagoAsociado.descuento_tipo !== 'ninguno' && (
                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descuento</p><p className="text-sm font-bold text-rose-600">{pagoAsociado.descuento_tipo === 'porcentaje' ? `${pagoAsociado.descuento_valor}%` : `$${pagoAsociado.descuento_valor}`}</p></div>
                              )}
                              {pagoAsociado.requiere_factura && (
                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Factura</p><p className="text-sm font-bold text-slate-700">Sí, CFDI</p></div>
                              )}
                            </div>
                            {productosVendidos.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Suplementos vendidos</p>
                                <div className="space-y-1">
                                  {productosVendidos.map(pp => {
                                    const prod = catalogo.find(p => p.id === pp.producto_id)
                                    return <p key={pp.id} className="text-sm font-bold text-slate-700">💊 {prod?.producto || 'Producto eliminado'} × {pp.cantidad} — ${(pp.precio_unit * pp.cantidad).toFixed(2)}</p>
                                  })}
                                </div>
                              </div>
                            )}
                          </SeccionDetalle>
                        )}
                        <SeccionDetalle titulo="Antecedentes" icono="📝"><CamposDetalle datos={c.antecedentes} etiquetas={ETIQUETAS_ANTECEDENTES} /></SeccionDetalle>
                        <SeccionDetalle titulo="Mediciones" icono="📏">
                          <CamposDetalle datos={c.mediciones} etiquetas={ETIQUETAS_MEDICIONES} />
                          {c.mediciones?.realizar_plicometria === 'Si' && c.mediciones?.plicometria && Object.keys(c.mediciones.plicometria).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Plicometría (mm)</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(c.mediciones.plicometria).map(([sitio, val]) => (
                                  <p key={sitio} className="text-xs font-bold text-slate-700">{sitio.replace('_', ' ')}: {String(val)}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </SeccionDetalle>
                        <SeccionDetalle titulo="Peso e InBody" icono="⚖️"><CamposDetalle datos={c.inbody} etiquetas={ETIQUETAS_INBODY} /></SeccionDetalle>
                        <SeccionDetalle titulo="Estilo de Vida" icono="🥗"><CamposDetalle datos={c.estilo_vida} etiquetas={ETIQUETAS_ESTILO_VIDA} /></SeccionDetalle>
                        <SeccionDetalle titulo="Enfoque Nutricional" icono="🎯"><CamposDetalle datos={c.enfoque_nutricional} etiquetas={ETIQUETAS_ENFOQUE} /></SeccionDetalle>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
