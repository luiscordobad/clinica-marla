"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { obtenerEstadoSesion, type SesionActual } from '../../../lib/auth'
import type { Cita, CategoriaDocumento, Consulta, DocumentoPaciente, Paciente, Pago, PagoProducto, Producto, Servicio } from '../../../lib/types'
import { ETIQUETA_CATEGORIA_DOCUMENTO } from '../../../lib/types'
import { fechaLocalISO } from '../../../lib/fecha'
import GraficaProgreso from '../../../components/GraficaProgreso'
import Link from 'next/link'

const ETIQUETAS_ANTECEDENTES: Record<string, string> = {
  heredo_familiares: 'Antecedentes Heredo Familiares (otros)',
  heredo_dm: 'Heredo — Diabetes (DM)',
  heredo_hat: 'Heredo — Hipertensión (HAT)',
  heredo_obesidad: 'Heredo — Obesidad',
  patologicos: 'Antecedentes Personales Patológicos (otros)',
  app_dislipidemia: 'APP — Dislipidemia',
  app_gastritis: 'APP — Gastritis',
  app_ansiedad: 'APP — Ansiedad',
  app_depresion: 'APP — Depresión',
  app_hiperglucemia: 'APP — Hiperglucemia',
  app_hiperuricemia: 'APP — Hiperuricemia',
  app_litiasis_renal: 'APP — Litiasis Renal',
  cirugias: 'Cirugías',
  no_patologicos: 'Antecedentes Personales No Patológicos (otros)',
  apnp_estrenimiento: 'APNP — Estreñimiento',
  apnp_cansancio: 'APNP — Cansancio',
  apnp_caida_cabello: 'APNP — Caída de Cabello',
  apnp_inflamacion: 'APNP — Inflamación',
  apnp_insomnio: 'APNP — Insomnio',
  apnp_falta_concentracion: 'APNP — Falta de Concentración',
  apnp_memoria_afectada: 'APNP — Memoria Afectada',
  laboratorios: 'Resultados de Laboratorios',
  medicamentos: 'Medicamentos',
  suplementos_actuales: 'Suplementos (otros / detalle)',
  sup_leca_c: 'Suplemento — Leca C',
  sup_omega_3: 'Suplemento — Omega 3',
  sup_proteina: 'Suplemento — Proteína (Vegetal/Whey)',
  sup_creatina: 'Suplemento — Creatina',
  sup_magnesio: 'Suplemento — Magnesio',
  sup_beta_alanina: 'Suplemento — Beta Alanina',
  sup_gaba: 'Suplemento — GABA',
  sup_inositol: 'Suplemento — Inositol',
  sueno: 'Patrón de Sueño (detalle)',
  sueno_horas: 'Horas de Sueño',
  sueno_interrumpido: 'Sueño Interrumpido',
  sueno_despertar: 'Al Despertar',
  objetivos: 'Objetivos Clínicos / Estéticos (otros)',
  objetivo_masa_muscular: 'Objetivo — Aumentar Masa Muscular',
  objetivo_bajar_grasa: 'Objetivo — Bajar Grasa',
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
  grasa_subir_kg: 'Grasa a subir (kg)',
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
  pep_semaglutida: 'Péptido — Semaglutida',
  pep_tirzepatida: 'Péptido — Tirzepatida',
  pep_retatrutide: 'Péptido — Retatrutide',
  pep_bpc157: 'Péptido — BPC-157',
  pep_tb500: 'Péptido — TB-500',
  pep_epitalon: 'Péptido — Epitalon',
  pep_humanin: 'Péptido — Humanin',
  pep_ghk_cu: 'Péptido — GHK-Cu',
  pep_nad: 'Péptido — NAD+',
}

const OPCIONES_SEMAGLUTIDA = ['', '0.25mg', '0.5mg', '1mg', '1.7mg', '2.4mg']
const OPCIONES_TIRZEPATIDA = ['', '2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg']
const PEPTIDOS_SI_NO: { k: string; l: string }[] = [
  { k: 'pep_retatrutide', l: 'Retatrutide' },
  { k: 'pep_bpc157', l: 'BPC-157' },
  { k: 'pep_tb500', l: 'TB-500' },
  { k: 'pep_epitalon', l: 'Epitalon' },
  { k: 'pep_humanin', l: 'Humanin' },
  { k: 'pep_ghk_cu', l: 'GHK-Cu' },
  { k: 'pep_nad', l: 'NAD+' },
]

function CamposDetalle({ datos, etiquetas }: { datos: Record<string, any> | null | undefined; etiquetas: Record<string, string> }) {
  if (!datos) return null
  const entradas = Object.entries(etiquetas).filter(([clave]) => datos[clave] !== undefined && datos[clave] !== null && String(datos[clave]).trim() !== '')
  if (entradas.length === 0) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {entradas.map(([clave, etiqueta]) => (
        <div key={clave}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{etiqueta}</p>
          <p className="text-sm font-bold text-slate-700">{String(datos[clave]).split(',').join(', ')}</p>
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

// Chips de toque único: tocas y ya quedó marcado, sin abrir un dropdown.
// Es el mismo patrón de "tags" que usan apps como Avena para llenar algo
// rápido desde el celular en vez de sentir que llenas un formulario.
function GrupoSiNo({ items, valores, onToggle }: { items: { k: string; l: string }[]; valores: Record<string, any>; onToggle: (nombre: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => {
        const activo = valores[item.k] === 'Si'
        return (
          <button
            key={item.k}
            type="button"
            onClick={() => onToggle(item.k)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${activo ? 'bg-teal-500 border-teal-500 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300'}`}
          >
            {activo && '✓ '}{item.l}
          </button>
        )
      })}
    </div>
  )
}

// Selector tipo "segmento": para elegir 1 de varias opciones con un toque,
// en vez de abrir un <select>. Mismo espíritu que GrupoSiNo.
function Segmentado({ opciones, valor, onSeleccionar }: { opciones: { v: string; l: string }[]; valor: string; onSeleccionar: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onSeleccionar(o.v)}
          className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${valor === o.v ? 'bg-[#0066FF] border-[#0066FF] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function SegmentadoMulti({ opciones, valor, onCambiar }: { opciones: { v: string; l: string }[]; valor: string; onCambiar: (v: string) => void }) {
  const seleccionados = valor ? valor.split(',').filter(Boolean) : []
  const alternar = (v: string) => {
    const nuevo = seleccionados.includes(v) ? seleccionados.filter(s => s !== v) : [...seleccionados, v]
    onCambiar(nuevo.join(','))
  }
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => alternar(o.v)}
          className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${seleccionados.includes(o.v) ? 'bg-[#0066FF] border-[#0066FF] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function colorGrasaPct(valor: string): string {
  const n = parseFloat(valor)
  if (isNaN(n)) return 'text-slate-700'
  if (n > 30) return 'text-red-500'
  if (n >= 20) return 'text-emerald-500'
  return 'text-amber-500'
}

const HEREDO_ITEMS = [
  { k: 'heredo_dm', l: 'Diabetes (DM)' }, { k: 'heredo_hat', l: 'Hipertensión (HAT)' }, { k: 'heredo_obesidad', l: 'Obesidad' },
]
const APP_ITEMS = [
  { k: 'app_dislipidemia', l: 'Dislipidemia' }, { k: 'app_gastritis', l: 'Gastritis' }, { k: 'app_ansiedad', l: 'Ansiedad' },
  { k: 'app_depresion', l: 'Depresión' }, { k: 'app_hiperglucemia', l: 'Hiperglucemia' }, { k: 'app_hiperuricemia', l: 'Hiperuricemia' },
  { k: 'app_litiasis_renal', l: 'Litiasis Renal' },
]
const APNP_ITEMS = [
  { k: 'apnp_estrenimiento', l: 'Estreñimiento' }, { k: 'apnp_cansancio', l: 'Cansancio' }, { k: 'apnp_caida_cabello', l: 'Caída de Cabello' },
  { k: 'apnp_inflamacion', l: 'Inflamación' }, { k: 'apnp_insomnio', l: 'Insomnio' },
  { k: 'apnp_falta_concentracion', l: 'Falta de Concentración' }, { k: 'apnp_memoria_afectada', l: 'Memoria Afectada' },
]
const SUPLEMENTOS_SI_NO_ITEMS = [
  { k: 'sup_leca_c', l: 'Leca C' }, { k: 'sup_omega_3', l: 'Omega 3' }, { k: 'sup_proteina', l: 'Proteína (Vegetal/Whey)' },
  { k: 'sup_creatina', l: 'Creatina' }, { k: 'sup_beta_alanina', l: 'Beta Alanina' }, { k: 'sup_gaba', l: 'GABA' }, { k: 'sup_inositol', l: 'Inositol' },
]

const FORM_CLINICO_VACIO = {
  heredo_familiares: '', heredo_dm: 'No', heredo_hat: 'No', heredo_obesidad: 'No',
  patologicos: '', app_dislipidemia: 'No', app_gastritis: 'No', app_ansiedad: 'No', app_depresion: 'No',
  app_hiperglucemia: 'No', app_hiperuricemia: 'No', app_litiasis_renal: 'No',
  cirugias: '', no_patologicos: '',
  apnp_estrenimiento: 'No', apnp_cansancio: 'No', apnp_caida_cabello: 'No', apnp_inflamacion: 'No',
  apnp_insomnio: 'No', apnp_falta_concentracion: 'No', apnp_memoria_afectada: 'No',
  laboratorios: '', medicamentos: '', suplementos_actuales: '',
  sup_leca_c: 'No', sup_omega_3: 'No', sup_proteina: 'No', sup_creatina: 'No', sup_magnesio: '',
  sup_beta_alanina: 'No', sup_gaba: 'No', sup_inositol: 'No',
  sueno: '', sueno_horas: '', sueno_interrumpido: 'No', sueno_despertar: '',
  objetivos: '', objetivo_masa_muscular: 'No', objetivo_bajar_grasa: 'No',
  circ_abdominal: '', circ_umbilical: '', bicep_izq_reposo: '', bicep_der_reposo: '',
  gluteo: '', muslo: '', pecho: '',
  p_abdominal: '', p_triceps: '', p_biceps: '', p_subescapular: '', p_suprailiaco: '', p_muslo: '', p_pantorrilla: '', p_pectoral: '', p_medio_axilar: '',
  peso_kg: '', musculo_esqu_kg: '', masa_grasa_kg: '', grasa_pct: '', grasa_visceral: '',
  tmb_kcal: '', agua_total_lt: '', peso_ideal_kg: '', grasa_bajar_kg: '', grasa_subir_kg: '', musculo_subir_kg: '',
  alergias_intolerancias: '', alcohol: 'No', cigarro: 'No', vape: 'No', drogas: 'No', agua_diaria: '', ansiedad: 'No',
  recordatorio_24h: '', restricciones_alimentarias: '', alimentos_mas_consumidos: '', alimentos_menos_consumidos: '',
  actividad_fisica_freq: '', actividad_fisica_duracion: '', actividad_fisica_intensidad: 'Moderada',
  deporte_disciplina: 'Gimnasio',
  enfoque: 'Deficit Calorico Ligero', aporte_calorico: '', tiempos_comida: '3',
  pct_carbohidratos: '', pct_proteinas: '', pct_grasas: '', notas_suplementos_recetados: '',
  pep_semaglutida: '', pep_tirzepatida: '', pep_retatrutide: 'No', pep_bpc157: 'No', pep_tb500: 'No',
  pep_epitalon: 'No', pep_humanin: 'No', pep_ghk_cu: 'No', pep_nad: 'No',
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
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [referidoPorNombre, setReferidoPorNombre] = useState<string | null>(null)
  const [referidosCount, setReferidosCount] = useState(0)
  const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([])
  const [subiendoDocumento, setSubiendoDocumento] = useState(false)
  const [categoriaNuevoDocumento, setCategoriaNuevoDocumento] = useState<CategoriaDocumento>('inbody')
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
  const [reciboParaImprimir, setReciboParaImprimir] = useState<{
    paciente: string; concepto: string; fecha: string; productos: string[]
    metodos: { label: string; monto: number }[]; total: number; requiereFactura: boolean
  } | null>(null)
  const [planParaImprimir, setPlanParaImprimir] = useState<{
    paciente: string; fecha: string; objetivos: string; enfoque: Record<string, any>
  } | null>(null)
  const [expedienteParaImprimir, setExpedienteParaImprimir] = useState(false)
  const mostrarToast = (mensaje: string, tipo: 'exito' | 'error' | 'advertencia') => { setToast({ mensaje, tipo }); setTimeout(() => setToast(null), 4000) }

  const [formClinico, setFormClinico] = useState(FORM_CLINICO_VACIO)
  const [borradorDisponible, setBorradorDisponible] = useState<{ guardadoEn: string; esPrimeraVez: boolean } | null>(null)
  const [ultimoAutoguardado, setUltimoAutoguardado] = useState<Date | null>(null)
  const claveBorrador = `expediente_borrador_${params.id}`

  const [checkout, setCheckout] = useState({
    concepto: '', precio: '', tipo_descuento: 'Ninguno', valor_descuento: '',
    proxima_fecha: '', proxima_hora: '',
  })
  const [productosVenta, setProductosVenta] = useState<string[]>([''])

  const hoyStr = fechaLocalISO()
  const esFullAccess = sesion?.esFullAccess ?? false
  const esPrimeraVez = consultas.length === 0
  const citaHoyEnEspera = citasPaciente.find(c => c.estado === 'en_espera' && c.fecha_cita === hoyStr)
  const citaHoyProgramada = citasPaciente.find(c => c.estado === 'programada' && c.fecha_cita === hoyStr)
  // Si ya se generó un cobro hoy (pagado o pendiente), esa visita ya se atendió:
  // no se debe volver a ofrecer Check-In aunque la cita ya no esté "en_espera".
  const yaAtendidoHoy = pagosPaciente.some(p => p.fecha.split('T')[0] === hoyStr)
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

  useEffect(() => {
    const cargarReferidos = async () => {
      if (!paciente) return
      if (paciente.referido_por_paciente_id) {
        const { data } = await supabase.from('pacientes').select('nombre_completo').eq('id', paciente.referido_por_paciente_id).single()
        setReferidoPorNombre(data?.nombre_completo || null)
      } else {
        setReferidoPorNombre(null)
      }
      const { count } = await supabase.from('pacientes').select('id', { count: 'exact', head: true }).eq('referido_por_paciente_id', paciente.id)
      setReferidosCount(count || 0)
    }
    cargarReferidos()
  }, [paciente?.id, paciente?.referido_por_paciente_id])

  // Detecta un borrador sin guardar (ej. por navegación accidental hacia atrás)
  useEffect(() => {
    if (!paciente || modoConsulta) return
    try {
      const raw = window.localStorage.getItem(claveBorrador)
      if (!raw) return
      const guardado = JSON.parse(raw)
      if (guardado?.formClinico) setBorradorDisponible({ guardadoEn: guardado.guardadoEn, esPrimeraVez: guardado.esPrimeraVez })
    } catch { /* borrador corrupto, se ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente?.id])

  // Autoguardado del wizard clínico: evita perder el avance por una navegación
  // accidental (botón atrás, recargar, cerrar pestaña) mientras se llena el expediente.
  useEffect(() => {
    if (!modoConsulta) return
    const guardar = setTimeout(() => {
      try {
        const ahora = new Date()
        window.localStorage.setItem(claveBorrador, JSON.stringify({
          formClinico, plicometriaValores, realizarPlicometria, seccionActiva, esPrimeraVez,
          guardadoEn: ahora.toISOString(),
        }))
        setUltimoAutoguardado(ahora)
      } catch { /* almacenamiento lleno o no disponible, se ignora */ }
    }, 500)
    return () => clearTimeout(guardar)
  }, [modoConsulta, formClinico, plicometriaValores, realizarPlicometria, seccionActiva, esPrimeraVez, claveBorrador])

  const retomarBorrador = () => {
    try {
      const raw = window.localStorage.getItem(claveBorrador)
      if (!raw) return
      const guardado = JSON.parse(raw)
      setFormClinico(prev => ({ ...prev, ...guardado.formClinico }))
      setPlicometriaValores(guardado.plicometriaValores || {})
      setRealizarPlicometria(guardado.realizarPlicometria || 'No')
      setSeccionActiva(guardado.seccionActiva || 'antecedentes')
      setBorradorDisponible(null)
      setModoConsulta(true)
      mostrarToast('Borrador recuperado.', 'exito')
    } catch {
      mostrarToast('No se pudo recuperar el borrador.', 'error')
    }
  }

  const descartarBorrador = () => {
    try { window.localStorage.removeItem(claveBorrador) } catch { /* ignorar */ }
    setBorradorDisponible(null)
  }

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

      const { data: srvData } = await supabase.from('servicios').select('*').eq('activo', true).order('orden', { ascending: true })
      if (srvData) setServicios(srvData as Servicio[])

      if (payData && payData.length > 0) {
        const { data: ppData } = await supabase.from('pago_productos').select('*').in('pago_id', payData.map(p => p.id))
        if (ppData) setPagoProductosPaciente(ppData as PagoProducto[])
      }

      const { data: docData } = await supabase.from('documentos_paciente').select('*').eq('paciente_id', params.id).order('created_at', { ascending: false })
      if (docData) setDocumentos(docData as DocumentoPaciente[])
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
  // DOCUMENTOS (InBody, laboratorios, etc.)
  // =======================================================
  const TIPOS_ACEPTADOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic']
  const TAMANO_MAXIMO = 10 * 1024 * 1024 // 10 MB, igual que el límite del bucket

  const subirDocumento = async (archivo: File) => {
    if (!paciente || !sesion) return
    if (!TIPOS_ACEPTADOS.includes(archivo.type)) return mostrarToast('Solo se aceptan PDF, JPG, PNG o HEIC.', 'advertencia')
    if (archivo.size > TAMANO_MAXIMO) return mostrarToast('El archivo pesa más de 10 MB.', 'advertencia')

    setSubiendoDocumento(true)
    const extension = archivo.name.split('.').pop() || 'pdf'
    const ruta = `${paciente.id}/${crypto.randomUUID()}.${extension}`

    const { error: errorSubida } = await supabase.storage.from('documentos-pacientes').upload(ruta, archivo)
    if (errorSubida) { mostrarToast('Error al subir: ' + errorSubida.message, 'error'); setSubiendoDocumento(false); return }

    const { error: errorRegistro } = await supabase.from('documentos_paciente').insert([{
      paciente_id: paciente.id,
      categoria: categoriaNuevoDocumento,
      nombre_original: archivo.name,
      storage_path: ruta,
      tamano_bytes: archivo.size,
      subido_por: sesion.usuario.id,
    }])
    if (errorRegistro) { mostrarToast('Error al registrar: ' + errorRegistro.message, 'error'); setSubiendoDocumento(false); return }

    await cargarDatos(esFullAccess)
    mostrarToast('Documento subido', 'exito')
    setSubiendoDocumento(false)
  }

  const verDocumento = async (doc: DocumentoPaciente) => {
    const { data, error } = await supabase.storage.from('documentos-pacientes').createSignedUrl(doc.storage_path, 300)
    if (error || !data) return mostrarToast('No se pudo abrir el documento.', 'error')
    window.open(data.signedUrl, '_blank')
  }

  const eliminarDocumento = async (doc: DocumentoPaciente) => {
    if (!window.confirm(`¿Eliminar "${doc.nombre_original}"? No se puede deshacer.`)) return
    await supabase.storage.from('documentos-pacientes').remove([doc.storage_path])
    const { error } = await supabase.from('documentos_paciente').delete().eq('id', doc.id)
    if (!error) { await cargarDatos(esFullAccess); mostrarToast('Documento eliminado', 'exito') } else mostrarToast('Error: ' + error.message, 'error')
  }

  const copiarLinkPortal = () => {
    if (!paciente) return
    navigator.clipboard.writeText(`${window.location.origin}/portal/${paciente.portal_token}`)
    mostrarToast('Link del portal copiado', 'exito')
  }

  const enviarLinkPortalWhatsApp = () => {
    if (!paciente?.telefono) return
    const link = `${window.location.origin}/portal/${paciente.portal_token}`
    const texto = `Hola ${paciente.nombre_completo}, aquí puedes ver tu próxima cita y tu plan nutricional de Clínica Marla 🌿:\n\n${link}`
    window.open(`https://wa.me/${String(paciente.telefono).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const alternarArchivado = async () => {
    if (!paciente) return
    const nuevoEstado = !paciente.activo
    if (nuevoEstado === false && !window.confirm('¿Archivar a este paciente? Ya no aparecerá en el directorio, pero su expediente se conserva y puedes reactivarlo cuando quieras.')) return
    const { error } = await supabase.from('pacientes').update({ activo: nuevoEstado }).eq('id', paciente.id)
    if (!error) { await cargarDatos(esFullAccess); mostrarToast(nuevoEstado ? 'Paciente reactivado' : 'Paciente archivado', 'exito') } else mostrarToast('Error: ' + error.message, 'error')
  }

  // =======================================================
  // REENVIAR TICKET DE UN COBRO PASADO (desde Historial Clínico)
  // =======================================================
  const reenviarTicketWhatsApp = (pago: Pago, productos: { nombre: string }[]) => {
    if (!paciente?.telefono) return mostrarToast('Este paciente no tiene teléfono registrado.', 'advertencia')
    const metodos = []
    if (pago.monto_efectivo > 0) metodos.push(`Efectivo: $${pago.monto_efectivo}`)
    if (pago.monto_tarjeta > 0) metodos.push(`Tarjeta: $${pago.monto_tarjeta}`)
    if (pago.monto_transferencia > 0) metodos.push(`Transferencia: $${pago.monto_transferencia}`)

    let texto = `*Clínica Marla - Ticket de Servicio* 🌿\n\nHola *${paciente.nombre_completo}*, aquí tienes de nuevo tu comprobante.\n\n🩺 *Servicio:* ${pago.concepto || ''}\n📅 *Fecha:* ${new Date(pago.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}\n`
    if (productos.length > 0) { texto += `\n*Suplementos:*\n`; productos.forEach(p => texto += `💊 ${p.nombre}\n`) }
    texto += `\n*Total:* $${pago.monto_esperado.toLocaleString()}\n💳 *Pago:* ${metodos.join(', ') || '—'}\n`
    if (pago.requiere_factura) texto += `\n📌 _Tu factura CFDI será enviada a tu correo registrado en breve._\n`
    texto += `\n¡Gracias por tu visita! ✨`

    window.open(`https://wa.me/${String(paciente.telefono).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const generarPlanPDF = (consulta: Consulta) => {
    if (!paciente) return
    setPlanParaImprimir({
      paciente: paciente.nombre_completo,
      fecha: new Date(consulta.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
      objetivos: consulta.antecedentes?.objetivos || obtenerUltimoNoVacio('antecedentes')?.objetivos || '',
      enfoque: consulta.enfoque_nutricional || {},
    })
    setReciboParaImprimir(null)
    setExpedienteParaImprimir(false)
    setTimeout(() => window.print(), 300)
  }

  const generarExpedienteCompletoPDF = () => {
    setReciboParaImprimir(null)
    setPlanParaImprimir(null)
    setExpedienteParaImprimir(true)
    setTimeout(() => window.print(), 300)
  }

  const imprimirTicketPasado = (pago: Pago, productos: { nombre: string }[]) => {
    if (!paciente) return
    setPlanParaImprimir(null)
    setExpedienteParaImprimir(false)
    setReciboParaImprimir({
      paciente: paciente.nombre_completo,
      concepto: pago.concepto || '',
      fecha: new Date(pago.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
      productos: productos.map(p => p.nombre),
      metodos: [
        ...(pago.monto_efectivo > 0 ? [{ label: 'Efectivo', monto: pago.monto_efectivo }] : []),
        ...(pago.monto_tarjeta > 0 ? [{ label: 'Tarjeta', monto: pago.monto_tarjeta }] : []),
        ...(pago.monto_transferencia > 0 ? [{ label: 'Transferencia', monto: pago.monto_transferencia }] : []),
      ],
      total: pago.monto_esperado,
      requiereFactura: pago.requiere_factura,
    })
    setTimeout(() => window.print(), 300)
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
  // Para seguimiento: trae el último antecedente/estilo de vida conocido (no
  // necesariamente de la consulta más reciente, por si esa fue un seguimiento
  // sin cambios) para que Marla lo revise y actualice en vez de partir de cero.
  function obtenerUltimoNoVacio<K extends 'antecedentes' | 'estilo_vida'>(campo: K): Consulta[K] | null {
    for (const c of consultas) {
      const valor = c[campo]
      if (valor && Object.keys(valor).length > 0) return valor
    }
    return null
  }

  const iniciarConsulta = () => {
    if (!esPrimeraVez) {
      const ant = obtenerUltimoNoVacio('antecedentes')
      const est = obtenerUltimoNoVacio('estilo_vida')
      if (ant || est) setFormClinico(prev => ({ ...prev, ...(ant || {}), ...(est || {}) }))
    }
    setSeccionActiva(esPrimeraVez ? 'antecedentes' : 'seguimiento_notas')
    setModoConsulta(true)
  }

  const abrirCheckout = () => {
    setModoConsulta(false)
    setShowCheckout(true)
    if (!checkout.concepto && servicios.length > 0) {
      const base = esPrimeraVez ? servicios[0] : (servicios[1] || servicios[0])
      setCheckout(prev => ({ ...prev, concepto: base.nombre, precio: String(base.precio) }))
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormClinico({ ...formClinico, [e.target.name]: e.target.value })
  }

  const setCampoClinico = (nombre: string, valor: string) => setFormClinico(prev => ({ ...prev, [nombre]: valor }))
  const alternarSiNo = (nombre: string) => setFormClinico(prev => ({ ...prev, [nombre]: (prev as any)[nombre] === 'Si' ? 'No' : 'Si' }))

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

    // Se guardan siempre (no solo en primera vez): en seguimiento el wizard
    // los pre-llena con el último valor conocido para que Marla los revise y
    // actualice si algo cambió (nueva alergia, nuevo medicamento, etc.).
    const antecedentes = {
      heredo_familiares: formClinico.heredo_familiares,
      heredo_dm: formClinico.heredo_dm, heredo_hat: formClinico.heredo_hat, heredo_obesidad: formClinico.heredo_obesidad,
      patologicos: formClinico.patologicos,
      app_dislipidemia: formClinico.app_dislipidemia, app_gastritis: formClinico.app_gastritis, app_ansiedad: formClinico.app_ansiedad,
      app_depresion: formClinico.app_depresion, app_hiperglucemia: formClinico.app_hiperglucemia, app_hiperuricemia: formClinico.app_hiperuricemia,
      app_litiasis_renal: formClinico.app_litiasis_renal,
      cirugias: formClinico.cirugias,
      no_patologicos: formClinico.no_patologicos,
      apnp_estrenimiento: formClinico.apnp_estrenimiento, apnp_cansancio: formClinico.apnp_cansancio, apnp_caida_cabello: formClinico.apnp_caida_cabello,
      apnp_inflamacion: formClinico.apnp_inflamacion, apnp_insomnio: formClinico.apnp_insomnio,
      apnp_falta_concentracion: formClinico.apnp_falta_concentracion, apnp_memoria_afectada: formClinico.apnp_memoria_afectada,
      laboratorios: formClinico.laboratorios, medicamentos: formClinico.medicamentos,
      suplementos_actuales: formClinico.suplementos_actuales,
      sup_leca_c: formClinico.sup_leca_c, sup_omega_3: formClinico.sup_omega_3, sup_proteina: formClinico.sup_proteina,
      sup_creatina: formClinico.sup_creatina, sup_magnesio: formClinico.sup_magnesio, sup_beta_alanina: formClinico.sup_beta_alanina,
      sup_gaba: formClinico.sup_gaba, sup_inositol: formClinico.sup_inositol,
      sueno: formClinico.sueno, sueno_horas: formClinico.sueno_horas, sueno_interrumpido: formClinico.sueno_interrumpido,
      sueno_despertar: formClinico.sueno_despertar,
      objetivos: formClinico.objetivos, objetivo_masa_muscular: formClinico.objetivo_masa_muscular, objetivo_bajar_grasa: formClinico.objetivo_bajar_grasa,
    }

    const mediciones = {
      circ_abdominal: formClinico.circ_abdominal, circ_umbilical: formClinico.circ_umbilical, pecho: formClinico.pecho,
      gluteo: formClinico.gluteo, muslo: formClinico.muslo, bicep_izq_reposo: formClinico.bicep_izq_reposo, bicep_der_reposo: formClinico.bicep_der_reposo,
      realizar_plicometria: realizarPlicometria, plicometria: realizarPlicometria === 'Si' ? plicometriaValores : {},
    }

    const inbody = {
      peso_kg: formClinico.peso_kg, musculo_esqu_kg: formClinico.musculo_esqu_kg, masa_grasa_kg: formClinico.masa_grasa_kg,
      grasa_pct: formClinico.grasa_pct, grasa_visceral: formClinico.grasa_visceral, tmb_kcal: formClinico.tmb_kcal,
      agua_total_lt: formClinico.agua_total_lt, peso_ideal_kg: formClinico.peso_ideal_kg, grasa_bajar_kg: formClinico.grasa_bajar_kg,
      grasa_subir_kg: formClinico.grasa_subir_kg, musculo_subir_kg: formClinico.musculo_subir_kg,
    }

    const estilo_vida = {
      alergias_intolerancias: formClinico.alergias_intolerancias, agua_diaria: formClinico.agua_diaria, ansiedad: formClinico.ansiedad,
      restricciones_alimentarias: formClinico.restricciones_alimentarias, alcohol: formClinico.alcohol, cigarro: formClinico.cigarro,
      vape: formClinico.vape, drogas: formClinico.drogas, recordatorio_24h: formClinico.recordatorio_24h,
      alimentos_mas_consumidos: formClinico.alimentos_mas_consumidos, alimentos_menos_consumidos: formClinico.alimentos_menos_consumidos,
      actividad_fisica_freq: formClinico.actividad_fisica_freq, actividad_fisica_duracion: formClinico.actividad_fisica_duracion,
      actividad_fisica_intensidad: formClinico.actividad_fisica_intensidad, deporte_disciplina: formClinico.deporte_disciplina,
    }

    const enfoque_nutricional = {
      enfoque: formClinico.enfoque, aporte_calorico: formClinico.aporte_calorico, tiempos_comida: formClinico.tiempos_comida,
      pct_carbohidratos: formClinico.pct_carbohidratos, pct_proteinas: formClinico.pct_proteinas, pct_grasas: formClinico.pct_grasas,
      notas_suplementos_recetados: formClinico.notas_suplementos_recetados,
      pep_semaglutida: formClinico.pep_semaglutida, pep_tirzepatida: formClinico.pep_tirzepatida,
      pep_retatrutide: formClinico.pep_retatrutide, pep_bpc157: formClinico.pep_bpc157, pep_tb500: formClinico.pep_tb500,
      pep_epitalon: formClinico.pep_epitalon, pep_humanin: formClinico.pep_humanin, pep_ghk_cu: formClinico.pep_ghk_cu, pep_nad: formClinico.pep_nad,
    }

    const sumaMacros = (Number(formClinico.pct_carbohidratos) || 0) + (Number(formClinico.pct_proteinas) || 0) + (Number(formClinico.pct_grasas) || 0)
    if (sumaMacros !== 0 && sumaMacros !== 100) {
      return mostrarToast(`La distribución de macros debe sumar 100% (ahora suma ${sumaMacros}%).`, 'advertencia')
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
    try { window.localStorage.removeItem(claveBorrador) } catch { /* ignorar */ }
    setShowCheckout(false); setModoConsulta(false); setProductosVenta([''])
    setFormClinico(FORM_CLINICO_VACIO); setPlicometriaValores({}); setRealizarPlicometria('No'); setUltimoAutoguardado(null)
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
            {ultimoAutoguardado && (
              <p className="text-[9px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Guardado {ultimoAutoguardado.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
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
                { id: 'antecedentes', label: '4. Actualizar Antecedentes', icon: '📝' },
                { id: 'estilo', label: '5. Actualizar Estilo de Vida', icon: '🥗' },
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

            {seccionActiva === 'antecedentes' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">1. Historial de Antecedentes</h3>
                {!esPrimeraVez && (
                  <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-xs text-sky-900 font-medium">
                    Se precargó lo último registrado. Solo actualiza lo que haya cambiado (nuevo medicamento, alergia, cirugía, etc.).
                  </div>
                )}
                <div className="space-y-5">

                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <p className="font-bold text-sm text-slate-700">Antecedentes Heredo Familiares</p>
                    <GrupoSiNo items={HEREDO_ITEMS} valores={formClinico} onToggle={alternarSiNo} />
                    <textarea name="heredo_familiares" value={formClinico.heredo_familiares} onChange={handleFormChange} placeholder="Otro / cómo está..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2} />
                  </div>

                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <p className="font-bold text-sm text-slate-700">Antecedentes Personales Patológicos (APP)</p>
                    <GrupoSiNo items={APP_ITEMS} valores={formClinico} onToggle={alternarSiNo} />
                    <textarea name="patologicos" value={formClinico.patologicos} onChange={handleFormChange} placeholder="Otro..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2} />
                  </div>

                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Cirugías</label><textarea name="cirugias" value={formClinico.cirugias} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2} /></div>

                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <p className="font-bold text-sm text-slate-700">Antecedentes Personales No Patológicos (APNP)</p>
                    <GrupoSiNo items={APNP_ITEMS} valores={formClinico} onToggle={alternarSiNo} />
                    <textarea name="no_patologicos" value={formClinico.no_patologicos} onChange={handleFormChange} placeholder="Más campo libre..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all" rows={2} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Resultados de Laboratorios</label>
                      <input type="text" name="laboratorios" value={formClinico.laboratorios} onChange={handleFormChange} placeholder="Notas rápidas — el PDF se sube en Documentos ↓" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Medicamentos</label><input type="text" name="medicamentos" value={formClinico.medicamentos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" /></div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <p className="font-bold text-sm text-slate-700">Suplementos que toma actualmente</p>
                    <GrupoSiNo items={SUPLEMENTOS_SI_NO_ITEMS} valores={formClinico} onToggle={alternarSiNo} />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Magnesio</p>
                      <Segmentado opciones={[{ v: '', l: 'No toma' }, { v: 'GL', l: 'GL' }, { v: 'CT', l: 'CT' }, { v: 'Otro', l: 'Otro' }]} valor={formClinico.sup_magnesio} onSeleccionar={(v) => setCampoClinico('sup_magnesio', v)} />
                    </div>
                    <input type="text" name="suplementos_actuales" value={formClinico.suplementos_actuales} onChange={handleFormChange} placeholder="Otro / detalle..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>

                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <p className="font-bold text-sm text-slate-700">Patrón de Sueño</p>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Horas</p>
                      <Segmentado opciones={[{ v: '6_o_menos', l: '6 o menos' }, { v: '7_a_8', l: '7 - 8' }, { v: '8_o_mas', l: '8 o más' }]} valor={formClinico.sueno_horas} onSeleccionar={(v) => setCampoClinico('sueno_horas', v)} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Interrumpido</p>
                      <GrupoSiNo items={[{ k: 'sueno_interrumpido', l: 'Sueño interrumpido' }]} valores={formClinico} onToggle={alternarSiNo} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Al despertar</p>
                      <Segmentado opciones={[{ v: 'Con energia', l: 'Con energía' }, { v: 'Cansado', l: 'Cansado' }]} valor={formClinico.sueno_despertar} onSeleccionar={(v) => setCampoClinico('sueno_despertar', v)} />
                    </div>
                    <input type="text" name="sueno" value={formClinico.sueno} onChange={handleFormChange} placeholder="Detalle adicional..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>

                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <p className="font-bold text-sm text-slate-700">Objetivos Clínicos / Estéticos</p>
                    <GrupoSiNo items={[{ k: 'objetivo_masa_muscular', l: 'Aumento Masa Muscular' }, { k: 'objetivo_bajar_grasa', l: 'Bajar Grasa' }]} valores={formClinico} onToggle={alternarSiNo} />
                    <input type="text" name="objetivos" value={formClinico.objetivos} onChange={handleFormChange} placeholder="Personalizar / otro objetivo..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>

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
                  <div className="flex flex-wrap justify-between items-center gap-3"><label className="text-sm font-bold text-slate-700">¿Realizar Plicometría de Pliegues?</label><Segmentado opciones={[{ v: 'No', l: 'No' }, { v: 'Si', l: 'Sí' }]} valor={realizarPlicometria} onSeleccionar={(v) => setRealizarPlicometria(v as 'Si' | 'No')} /></div>

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
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Porcentaje de Grasa (%)</label><input type="number" step="0.1" name="grasa_pct" value={formClinico.grasa_pct} onChange={handleFormChange} className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 ${colorGrasaPct(formClinico.grasa_pct)}`} /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Grasa Visceral (Nivel)</label><input type="number" name="grasa_visceral" value={formClinico.grasa_visceral} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">TMB (kcal)</label><input type="number" name="tmb_kcal" value={formClinico.tmb_kcal} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Agua Corporal Total (Lts)</label><input type="number" step="0.1" name="agua_total_lt" value={formClinico.agua_total_lt} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Peso Ideal Configurado (kg)</label><input type="number" step="0.1" name="peso_ideal_kg" value={formClinico.peso_ideal_kg} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-red-600 mb-1.5 ml-1">Grasa a bajar (kg)</label><input type="number" step="0.1" name="grasa_bajar_kg" value={formClinico.grasa_bajar_kg} onChange={handleFormChange} className="w-full p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" /></div>
                  <div><label className="block text-xs font-bold text-sky-600 mb-1.5 ml-1">Grasa a subir (kg)</label><input type="number" step="0.1" name="grasa_subir_kg" value={formClinico.grasa_subir_kg} onChange={handleFormChange} className="w-full p-4 bg-sky-50 border border-sky-200 text-sky-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-sky-500" /></div>
                  <div><label className="block text-xs font-bold text-teal-600 mb-1.5 ml-1">Músculo a subir (kg)</label><input type="number" step="0.1" name="musculo_subir_kg" value={formClinico.musculo_subir_kg} onChange={handleFormChange} className="w-full p-4 bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" /></div>
                </div>
              </div>
            )}

            {seccionActiva === 'estilo' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">4. Alimentación y Estilo de Vida</h3>
                {!esPrimeraVez && (
                  <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-xs text-sky-900 font-medium">
                    Se precargó lo último registrado. Solo actualiza lo que haya cambiado.
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Alergias o Intolerancias</label><input type="text" name="alergias_intolerancias" value={formClinico.alergias_intolerancias} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Consumo de Agua Diario</label><input type="text" name="agua_diaria" value={formClinico.agua_diaria} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Ansiedad / Estrés</label><Segmentado opciones={[{ v: 'No', l: 'No presenta' }, { v: 'Leve', l: 'Leve' }, { v: 'Moderada', l: 'Moderada' }, { v: 'Alta', l: 'Alta' }]} valor={formClinico.ansiedad} onSeleccionar={(v) => setCampoClinico('ansiedad', v)} /></div>
                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Restricciones Alimentarias</label><input type="text" name="restricciones_alimentarias" value={formClinico.restricciones_alimentarias} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>

                  <div className="flex flex-col gap-3 bg-slate-50 border border-slate-200 p-4 rounded-3xl col-span-full shadow-sm">
                    {[{ k: 'alcohol', l: 'Alcohol' }, { k: 'cigarro', l: 'Cigarro' }, { k: 'vape', l: 'Vape' }, { k: 'drogas', l: 'Drogas' }].map(h => (
                      <div key={h.k} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-600">{h.l}</span>
                        <Segmentado opciones={[{ v: 'No', l: 'No' }, { v: 'Social', l: 'Social' }, { v: 'Frecuente', l: 'Frecuente' }]} valor={(formClinico as any)[h.k]} onSeleccionar={(v) => setCampoClinico(h.k, v)} />
                      </div>
                    ))}
                  </div>

                  <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Recordatorio de 24 Horas (Alimentación diaria normal)</label><textarea name="recordatorio_24h" value={formClinico.recordatorio_24h} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" rows={3} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Alimentos más consumidos</label><input type="text" name="alimentos_mas_consumidos" value={formClinico.alimentos_mas_consumidos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Alimentos menos consumidos</label><input type="text" name="alimentos_menos_consumidos" value={formClinico.alimentos_menos_consumidos} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>

                  <div className="col-span-full bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                    <p className="font-bold text-sm text-slate-700">Actividad Física</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Frecuencia Semanal</label><input type="text" name="actividad_fisica_freq" value={formClinico.actividad_fisica_freq} onChange={handleFormChange} placeholder="Ej. 4 días" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500" /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Duración Sesión</label><input type="text" name="actividad_fisica_duracion" value={formClinico.actividad_fisica_duracion} onChange={handleFormChange} placeholder="Ej. 1 hora" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500" /></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Intensidad</p>
                      <Segmentado opciones={[{ v: 'Ligera', l: 'Ligera' }, { v: 'Moderada', l: 'Moderada' }, { v: 'Vigorosa', l: 'Vigorosa' }]} valor={formClinico.actividad_fisica_intensidad} onSeleccionar={(v) => setCampoClinico('actividad_fisica_intensidad', v)} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Disciplina / Deporte</p>
                      <SegmentadoMulti
                        opciones={[
                          { v: 'Gimnasio', l: 'Gimnasio' }, { v: 'Funcional', l: 'Funcional' }, { v: 'Calistenia', l: 'Calistenia' }, { v: 'Barre', l: 'Barré' }, { v: 'Pilates', l: 'Pilates' },
                          { v: 'Natacion', l: 'Natación' }, { v: 'Bicicleta', l: 'Bicicleta' }, { v: 'Indoor Cycling', l: 'Indoor Cycling' }, { v: 'Crossfit', l: 'Crossfit' }, { v: 'Box', l: 'Box' }, { v: 'MMA', l: 'MMA' }, { v: 'Cardio', l: 'Cardio' },
                          { v: 'Carrera_5k', l: 'Carrera 5 km' }, { v: 'Carrera_8k', l: 'Carrera 8 km' }, { v: 'Carrera_10k', l: 'Carrera 10 km' }, { v: 'Carrera_12k', l: 'Carrera 12 km' }, { v: 'Carrera_15k', l: 'Carrera 15 km' }, { v: 'Carrera_20k', l: 'Carrera 20 km' }, { v: 'Carrera_21k', l: 'Medio Maratón (21k+)' },
                        ]}
                        valor={formClinico.deporte_disciplina}
                        onCambiar={(v) => setCampoClinico('deporte_disciplina', v)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {seccionActiva === 'enfoque' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-3">Enfoque Nutricional</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Enfoque Nutricional</label>
                    <Segmentado opciones={[{ v: 'Deficit Calorico Ligero', l: 'Déficit Ligero' }, { v: 'Deficit Calorico Moderado', l: 'Déficit Moderado' }, { v: 'Deficit Calorico Estricto', l: 'Déficit Estricto' }, { v: 'Mantenimiento', l: 'Mantenimiento' }, { v: 'Superavit', l: 'Superávit' }]} valor={formClinico.enfoque} onSeleccionar={(v) => setCampoClinico('enfoque', v)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Aporte Calórico Sugerido (kcal)</label><input type="number" name="aporte_calorico" value={formClinico.aporte_calorico} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-teal-700 outline-none focus:ring-2 focus:ring-teal-500" /></div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Tiempos de comida al día</label>
                      <Segmentado opciones={['1', '2', '3', '4', '5', '6', '7'].map(n => ({ v: n, l: n === '7' ? '7 o más' : n }))} valor={formClinico.tiempos_comida} onSeleccionar={(v) => setCampoClinico('tiempos_comida', v)} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 grid grid-cols-3 gap-4 shadow-sm">
                  <div className="col-span-full flex items-center justify-between">
                    <p className="font-bold text-sm text-slate-700">Distribución de Macronutrientes (%)</p>
                    {(() => {
                      const suma = (Number(formClinico.pct_carbohidratos) || 0) + (Number(formClinico.pct_proteinas) || 0) + (Number(formClinico.pct_grasas) || 0)
                      if (suma === 0) return null
                      return <span className={`text-xs font-black px-2.5 py-1 rounded-full ${suma === 100 ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-600'}`}>Total: {suma}% {suma === 100 ? '✓' : '⚠️ debe sumar 100%'}</span>
                    })()}
                  </div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Carbohidratos</label><input type="number" name="pct_carbohidratos" value={formClinico.pct_carbohidratos} onChange={handleFormChange} placeholder="%" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500 text-center" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Proteínas</label><input type="number" name="pct_proteinas" value={formClinico.pct_proteinas} onChange={handleFormChange} placeholder="%" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500 text-center" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Grasas</label><input type="number" name="pct_grasas" value={formClinico.pct_grasas} onChange={handleFormChange} placeholder="%" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500 text-center" /></div>
                </div>

                <div className="col-span-full"><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prescripción de Suplementación Específica</label><textarea name="notas_suplementos_recetados" value={formClinico.notas_suplementos_recetados} onChange={handleFormChange} placeholder="Dosis y marcas de suplementos indicados..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500" rows={3} /></div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <p className="font-bold text-sm text-slate-700">Prescripción de Péptidos</p>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Semaglutida</p>
                    <Segmentado opciones={OPCIONES_SEMAGLUTIDA.map(d => ({ v: d, l: d === '' ? 'No aplica' : d }))} valor={formClinico.pep_semaglutida} onSeleccionar={(v) => setCampoClinico('pep_semaglutida', v)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Tirzepatida</p>
                    <Segmentado opciones={OPCIONES_TIRZEPATIDA.map(d => ({ v: d, l: d === '' ? 'No aplica' : d }))} valor={formClinico.pep_tirzepatida} onSeleccionar={(v) => setCampoClinico('pep_tirzepatida', v)} />
                  </div>
                  <GrupoSiNo items={PEPTIDOS_SI_NO} valores={formClinico} onToggle={alternarSiNo} />
                </div>
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
                {servicios.map(srv => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => handleServiceSelect(srv.nombre, String(srv.precio))}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-2 ${checkout.concepto === srv.nombre ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}
                  >
                    <span className="text-2xl">{srv.icono}</span>
                    <div className="mt-1">
                      <p className={`text-xs font-bold leading-tight ${checkout.concepto === srv.nombre ? 'text-teal-900' : 'text-slate-700'}`}>{srv.nombre}</p>
                      <p className={`text-[11px] font-black mt-1 ${checkout.concepto === srv.nombre ? 'text-teal-700' : 'text-slate-400'}`}>${srv.precio}</p>
                    </div>
                  </button>
                ))}
                {servicios.length === 0 && <p className="col-span-full text-xs text-slate-400 text-center py-4">Sin servicios configurados — agrégalos en Ajustes → Servicios.</p>}
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
                      {catalogo.map(p => (
                        <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                          {p.producto} — ${p.precio_venta} {p.stock <= 0 ? '(SIN STOCK)' : p.stock <= 5 ? `(quedan ${p.stock})` : ''}
                        </option>
                      ))}
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
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Fecha de Nacimiento</label>
                <input type="date" name="fecha_nacimiento" value={editForm.fecha_nacimiento} onChange={handleEditFormChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm" />
              </div>
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
        {borradorDisponible && esFullAccess && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <p className="text-sm font-black text-amber-900">Tienes un borrador de consulta sin guardar</p>
                <p className="text-xs text-amber-700 font-medium mt-0.5">Se guardó automáticamente el {new Date(borradorDisponible.guardadoEn).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}. Puedes retomarlo donde lo dejaste.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <button onClick={descartarBorrador} className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors">Descartar</button>
              <button onClick={retomarBorrador} className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black hover:bg-amber-600 transition-colors">Retomar borrador</button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
          <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2"><span className="text-lg">&larr;</span> Directorio</Link>

          <div className="flex gap-2">
            {!citaHoyEnEspera && !yaAtendidoHoy && citaHoyProgramada && (
              <button onClick={hacerCheckIn} className="px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100">
                <span>🛋️</span> <span className="hidden sm:inline">Anunciar Llegada</span> Check-In
              </button>
            )}
            {!citaHoyEnEspera && !yaAtendidoHoy && !citaHoyProgramada && (
              <button onClick={() => { if (window.confirm(`${paciente.nombre_completo} no tiene cita programada para hoy. ¿Registrarlo de todas formas como visita sin cita?`)) hacerCheckIn() }} className="px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100">
                <span>➕</span> <span className="hidden sm:inline">Registrar</span> Visita Sin Cita
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
          <div className="flex justify-between items-start mb-5 gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{paciente.nombre_completo}</h2>
                {!paciente.activo && <span className="text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 px-2 py-1 rounded-md">Archivado</span>}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button onClick={abrirEdicionPaciente} className="text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1 font-bold bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">✏️ Editar Perfil</button>
                <button onClick={alternarArchivado} className={`text-xs flex items-center gap-1 font-bold px-3 py-1 rounded-lg border ${paciente.activo ? 'text-rose-500 hover:text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 border-emerald-100'}`}>
                  {paciente.activo ? '🗄️ Archivar' : '♻️ Reactivar'}
                </button>
                <button onClick={copiarLinkPortal} className="text-xs text-slate-400 hover:text-[#0066FF] flex items-center gap-1 font-bold bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">🔗 Copiar Link Portal</button>
                {paciente.telefono && (
                  <button onClick={enviarLinkPortalWhatsApp} className="text-xs text-[#128C7E] hover:text-white hover:bg-[#25D366] flex items-center gap-1 font-bold bg-[#25D366]/10 px-3 py-1 rounded-lg border border-[#25D366]/20 transition-colors">📱 Enviar Portal</button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
            <div><p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Teléfono</p><p className="font-bold text-slate-800">{paciente.telefono || 'N/A'}</p></div>
            {referidoPorNombre && (
              <div><p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Referido por</p><p className="font-bold text-slate-800">{referidoPorNombre}</p></div>
            )}
            {referidosCount > 0 && (
              <div><p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Pacientes referidos</p><p className="font-bold text-teal-600">🎁 {referidosCount}</p></div>
            )}
          </div>
        </div>

        {esFullAccess && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <h3 className="text-base font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-2"><span>📁</span> Documentos (InBody, Laboratorios...)</h3>

            <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <select value={categoriaNuevoDocumento} onChange={e => setCategoriaNuevoDocumento(e.target.value as CategoriaDocumento)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none">
                <option value="inbody">InBody</option>
                <option value="laboratorio">Laboratorio</option>
                <option value="otro">Otro</option>
              </select>
              <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-colors ${subiendoDocumento ? 'bg-slate-200 text-slate-400' : 'bg-[#0066FF] text-white hover:bg-blue-700'}`}>
                {subiendoDocumento ? 'Subiendo...' : '⬆️ Subir Archivo (PDF, JPG, PNG)'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.heic"
                  className="hidden"
                  disabled={subiendoDocumento}
                  onChange={(e) => { const archivo = e.target.files?.[0]; if (archivo) subirDocumento(archivo); e.target.value = '' }}
                />
              </label>
            </div>

            {documentos.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium text-center py-4">Todavía no hay documentos subidos.</p>
            ) : (
              <div className="space-y-2">
                {documentos.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <button onClick={() => verDocumento(doc)} className="flex items-center gap-3 min-w-0 text-left hover:opacity-70 transition-opacity">
                      <span className="text-2xl shrink-0">{doc.storage_path.endsWith('pdf') ? '📄' : '🖼️'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{doc.nombre_original}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{ETIQUETA_CATEGORIA_DOCUMENTO[doc.categoria]} · {new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </button>
                    <button onClick={() => eliminarDocumento(doc)} className="shrink-0 text-rose-400 hover:text-rose-600 text-xs font-bold px-2">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {esFullAccess && !esPrimeraVez && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <h3 className="text-base font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-2"><span>📈</span> Progreso</h3>
            <GraficaProgreso puntos={[...consultas].reverse().map(c => ({ fecha: c.fecha, peso: c.peso_actual, grasa: c.porcentaje_grasa }))} />
          </div>
        )}

        {esFullAccess && !esPrimeraVez && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><span>📋</span> Historial Clínico</h3>
              {consultas.length > 0 && (
                <button onClick={generarExpedienteCompletoPDF} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                  📄 Exportar Expediente Completo (PDF)
                </button>
              )}
            </div>
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
                              <div className="mb-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Suplementos vendidos</p>
                                <div className="space-y-1">
                                  {productosVendidos.map(pp => {
                                    const prod = catalogo.find(p => p.id === pp.producto_id)
                                    return <p key={pp.id} className="text-sm font-bold text-slate-700">💊 {prod?.producto || 'Producto eliminado'} × {pp.cantidad} — ${(pp.precio_unit * pp.cantidad).toFixed(2)}</p>
                                  })}
                                </div>
                              </div>
                            )}
                            {pagoAsociado.estado === 'pagado' && (
                              <div className="flex gap-2 pt-3 border-t border-slate-200">
                                <button
                                  onClick={() => reenviarTicketWhatsApp(pagoAsociado, productosVendidos.map(pp => ({ nombre: catalogo.find(p => p.id === pp.producto_id)?.producto || 'Producto' })))}
                                  className="flex items-center gap-1.5 bg-[#25D366]/10 text-[#128C7E] text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#25D366] hover:text-white transition-colors"
                                >
                                  📱 Reenviar por WhatsApp
                                </button>
                                <button
                                  onClick={() => imprimirTicketPasado(pagoAsociado, productosVendidos.map(pp => ({ nombre: catalogo.find(p => p.id === pp.producto_id)?.producto || 'Producto' })))}
                                  className="flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                                >
                                  🖨️ Imprimir Ticket
                                </button>
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
                        <SeccionDetalle titulo="Enfoque Nutricional" icono="🎯">
                          <CamposDetalle datos={c.enfoque_nutricional} etiquetas={ETIQUETAS_ENFOQUE} />
                          {c.enfoque_nutricional && Object.values(c.enfoque_nutricional).some(v => v !== undefined && v !== null && String(v).trim() !== '') && (
                            <button onClick={() => generarPlanPDF(c)} className="mt-3 flex items-center gap-1.5 bg-[#0066FF]/10 text-[#0066FF] text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#0066FF] hover:text-white transition-colors">
                              📄 Generar Plan Nutricional (PDF)
                            </button>
                          )}
                        </SeccionDetalle>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {reciboParaImprimir && (
        <div className="ticket-imprimible hidden print:block p-8 text-black bg-white">
          <div className="max-w-sm mx-auto">
            <h1 className="text-xl font-black text-center mb-1">Clínica Marla 🌿</h1>
            <p className="text-xs text-center text-slate-600 mb-6">Ticket de Servicio</p>
            <div className="border-t border-b border-slate-300 py-3 mb-3 text-sm">
              <p><strong>Paciente:</strong> {reciboParaImprimir.paciente}</p>
              <p><strong>Fecha:</strong> {reciboParaImprimir.fecha}</p>
              <p><strong>Servicio:</strong> {reciboParaImprimir.concepto}</p>
            </div>
            {reciboParaImprimir.productos.length > 0 && (
              <div className="mb-3 text-sm">
                <p className="font-bold mb-1">Suplementos:</p>
                {reciboParaImprimir.productos.map((p, i) => <p key={i}>• {p}</p>)}
              </div>
            )}
            <div className="mb-3 text-sm">
              <p className="font-bold mb-1">Forma de pago:</p>
              {reciboParaImprimir.metodos.map((m, i) => <p key={i}>{m.label}: ${m.monto.toLocaleString()}</p>)}
            </div>
            <div className="border-t border-slate-300 pt-3 flex justify-between text-base font-black">
              <span>TOTAL</span>
              <span>${reciboParaImprimir.total.toLocaleString()}</span>
            </div>
            {reciboParaImprimir.requiereFactura && <p className="text-xs text-center mt-4">Tu factura CFDI será enviada a tu correo registrado.</p>}
            <p className="text-xs text-center mt-6 text-slate-500">¡Gracias por tu visita!</p>
          </div>
        </div>
      )}

      {planParaImprimir && (
        <div className="ticket-imprimible hidden print:block p-10 text-black bg-white">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-black text-center mb-1">Clínica Marla 🌿</h1>
            <p className="text-sm text-center text-slate-600 mb-8">Plan Nutricional Personalizado</p>
            <div className="border-t border-b border-slate-300 py-3 mb-6 text-sm flex justify-between">
              <p><strong>Paciente:</strong> {planParaImprimir.paciente}</p>
              <p><strong>Fecha:</strong> {planParaImprimir.fecha}</p>
            </div>
            {planParaImprimir.objetivos && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Objetivo</p>
                <p className="text-sm">{planParaImprimir.objetivos}</p>
              </div>
            )}
            {planParaImprimir.enfoque.enfoque && (
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Enfoque Nutricional</p>
                <p className="text-base font-bold">{planParaImprimir.enfoque.enfoque}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {planParaImprimir.enfoque.aporte_calorico && (
                <div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Kcal Objetivo</p><p className="text-xl font-black">{planParaImprimir.enfoque.aporte_calorico} kcal</p></div>
              )}
              {planParaImprimir.enfoque.tiempos_comida && (
                <div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Tiempos de comida</p><p className="text-xl font-black">{planParaImprimir.enfoque.tiempos_comida}</p></div>
              )}
            </div>
            {(planParaImprimir.enfoque.pct_carbohidratos || planParaImprimir.enfoque.pct_proteinas || planParaImprimir.enfoque.pct_grasas) && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Distribución de Macronutrientes</p>
                <div className="grid grid-cols-3 gap-3 text-center border border-slate-300 rounded-lg py-3">
                  <div><p className="text-lg font-black">{planParaImprimir.enfoque.pct_carbohidratos || 0}%</p><p className="text-[10px] uppercase text-slate-500">Carbohidratos</p></div>
                  <div><p className="text-lg font-black">{planParaImprimir.enfoque.pct_proteinas || 0}%</p><p className="text-[10px] uppercase text-slate-500">Proteínas</p></div>
                  <div><p className="text-lg font-black">{planParaImprimir.enfoque.pct_grasas || 0}%</p><p className="text-[10px] uppercase text-slate-500">Grasas</p></div>
                </div>
              </div>
            )}
            {planParaImprimir.enfoque.notas_suplementos_recetados && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Suplementación Indicada</p>
                <p className="text-sm">{planParaImprimir.enfoque.notas_suplementos_recetados}</p>
              </div>
            )}
            <p className="text-xs text-center mt-10 text-slate-500">Este plan es personalizado — no lo compartas con otras personas.</p>
          </div>
        </div>
      )}

      {expedienteParaImprimir && paciente && (
        <div className="ticket-imprimible hidden print:block p-10 text-black bg-white">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-black text-center mb-1">Clínica Marla 🌿</h1>
            <p className="text-sm text-center text-slate-600 mb-1">Expediente Clínico Completo</p>
            <p className="text-sm text-center font-bold mb-8">{paciente.nombre_completo}</p>

            {[...consultas].reverse().map((c, i) => (
              <div key={c.id} className={i > 0 ? 'pt-8 mt-8 border-t-2 border-slate-800' : ''} style={i > 0 ? { pageBreakBefore: 'always' } : undefined}>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">{c.tipo === 'primera_vez' ? 'Consulta Inicial' : 'Consulta de Seguimiento'}</p>
                <p className="text-lg font-black mb-4">{new Date(c.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {c.notas_evolucion && <p className="text-sm mb-4">{c.notas_evolucion}</p>}
                {(c.peso_actual || c.porcentaje_grasa) && (
                  <p className="text-xs font-bold mb-4">⚖️ {c.peso_actual ? `${c.peso_actual} kg` : ''} {c.porcentaje_grasa ? `• ${c.porcentaje_grasa}% grasa` : ''}</p>
                )}
                <div className="space-y-4 text-sm">
                  <div><p className="text-xs font-black uppercase tracking-widest border-b border-slate-300 pb-1 mb-2">Antecedentes</p><CamposDetalle datos={c.antecedentes} etiquetas={ETIQUETAS_ANTECEDENTES} /></div>
                  <div><p className="text-xs font-black uppercase tracking-widest border-b border-slate-300 pb-1 mb-2">Mediciones</p><CamposDetalle datos={c.mediciones} etiquetas={ETIQUETAS_MEDICIONES} /></div>
                  <div><p className="text-xs font-black uppercase tracking-widest border-b border-slate-300 pb-1 mb-2">Peso e InBody</p><CamposDetalle datos={c.inbody} etiquetas={ETIQUETAS_INBODY} /></div>
                  <div><p className="text-xs font-black uppercase tracking-widest border-b border-slate-300 pb-1 mb-2">Estilo de Vida</p><CamposDetalle datos={c.estilo_vida} etiquetas={ETIQUETAS_ESTILO_VIDA} /></div>
                  <div><p className="text-xs font-black uppercase tracking-widest border-b border-slate-300 pb-1 mb-2">Enfoque Nutricional</p><CamposDetalle datos={c.enfoque_nutricional} etiquetas={ETIQUETAS_ENFOQUE} /></div>
                </div>
              </div>
            ))}

            <p className="text-xs text-center mt-10 text-slate-500">Documento de uso clínico interno — Clínica Marla.</p>
          </div>
        </div>
      )}
    </main>
  )
}
