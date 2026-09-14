"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { obtenerEstadoSesion, type SesionActual } from '../lib/auth'
import {
  DURACION_POR_TIPO, ETIQUETA_TIPO_CITA,
  type Cita, type EstadoCita, type Gasto, type Paciente, type Pago, type PagoProducto, type Producto, type TipoCita,
} from '../lib/types'
import Link from 'next/link'

export default function Home() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [pagoProductos, setPagoProductos] = useState<PagoProducto[]>([])
  const [inventario, setInventario] = useState<Producto[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])

  const [loading, setLoading] = useState(true)
  const [sesion, setSesion] = useState<SesionActual | null>(null)

  const [horaActual, setHoraActual] = useState(new Date())

  const [activeTab, setActiveTab] = useState('Mi Consultorio')
  const [vistaAgenda, setVistaAgenda] = useState<'Dia' | 'Semana'>('Semana')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTiempo, setFiltroTiempo] = useState('Mes Actual')

  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' | 'advertencia' } | null>(null)

  const [cobroActivo, setCobroActivo] = useState<Pago | null>(null)
  const [formCobro, setFormCobro] = useState({ efectivo: '', tarjeta: '', transferencia: '', requiereFactura: false, recibo: 'whatsapp' })
  const [procesandoCobro, setProcesandoCobro] = useState(false)
  const [urlWhatsAppPendiente, setUrlWhatsAppPendiente] = useState<string | null>(null)

  const [showModalAgendar, setShowModalAgendar] = useState(false)
  const [formCita, setFormCita] = useState<{ paciente_id: string; fecha: string; hora: string; tipo: TipoCita; repeticion: number }>({ paciente_id: '', fecha: '', hora: '', tipo: 'seguimiento', repeticion: 1 })
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null)

  const [modoEdicionCita, setModoEdicionCita] = useState(false)
  const [formEdicion, setFormEdicion] = useState<{ fecha: string; hora: string; tipo: TipoCita }>({ fecha: '', hora: '', tipo: 'seguimiento' })

  const [formGasto, setFormGasto] = useState({ fecha: new Date().toISOString().split('T')[0], concepto: '', categoria: 'Fijos (Renta, Servicios)', monto: '' })

  const [showMenuPerfil, setShowMenuPerfil] = useState(false)
  const [showModalCalendario, setShowModalCalendario] = useState(false)
  const [regenerandoToken, setRegenerandoToken] = useState(false)

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
    const timer = setInterval(() => setHoraActual(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (citaSeleccionada) {
      setFormEdicion({ fecha: citaSeleccionada.fecha_cita, hora: citaSeleccionada.hora_cita.substring(0, 5), tipo: citaSeleccionada.tipo })
      setModoEdicionCita(false)
    }
  }, [citaSeleccionada])

  const enviarNotificacionEscritorio = (titulo: string, cuerpo: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, { body: cuerpo, icon: '/favicon.ico' })
    }
  }

  const hoyFechaFormat = new Date().toISOString().split('T')[0]
  const mananaObj = new Date(); mananaObj.setDate(mananaObj.getDate() + 1)
  const mananaFechaFormat = mananaObj.toISOString().split('T')[0]

  const totalPagadoModal = Number(formCobro.efectivo) + Number(formCobro.tarjeta) + Number(formCobro.transferencia)
  const totalEsperadoModal = cobroActivo ? Number(cobroActivo.monto_esperado) : 0
  const balanceModal = totalPagadoModal - totalEsperadoModal

  const HORAS_SMART = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']
  const DIAS_NOMBRES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  const mostrarToast = (mensaje: string, tipo: 'exito' | 'error' | 'advertencia') => { setToast({ mensaje, tipo }); setTimeout(() => setToast(null), 4000) }

  const extraerFechaLocal = (val: any) => {
    if (!val) return null
    const str = String(val).trim()
    const matchISO = str.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (matchISO) return new Date(Number(matchISO[1]), Number(matchISO[2]) - 1, Number(matchISO[3]), 12)
    return null
  }

  const obtenerDiasSemana = (fechaBase: string) => {
    const d = new Date(fechaBase + 'T12:00:00'); const numeroDia = d.getDay(); const distanciaLunes = numeroDia === 0 ? -6 : 1 - numeroDia
    const lunes = new Date(d.setDate(d.getDate() + distanciaLunes))
    return Array.from({ length: 7 }).map((_, i) => { const tmp = new Date(lunes.getTime()); tmp.setDate(lunes.getDate() + i); return { iso: tmp.toISOString().split('T')[0], dateObj: tmp } })
  }

  const obtenerDiasMes = (fechaBase: string) => {
    const parts = fechaBase.split('-'); const y = parseInt(parts[0]), m = parseInt(parts[1]) - 1
    const primerDia = new Date(y, m, 1, 12), ultimoDia = new Date(y, m + 1, 0, 12)
    const dias: { iso: string, dateObj: Date, enMes: boolean }[] = []
    let desfase = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1
    for (let i = desfase; i > 0; i--) { const d = new Date(y, m, 1 - i, 12); dias.push({ iso: d.toISOString().split('T')[0], dateObj: d, enMes: false }) }
    for (let i = 1; i <= ultimoDia.getDate(); i++) { const d = new Date(y, m, i, 12); dias.push({ iso: d.toISOString().split('T')[0], dateObj: d, enMes: true }) }
    const remaining = dias.length % 7
    if (remaining !== 0) { for (let i = 1; i <= 7 - remaining; i++) { const d = new Date(y, m + 1, i, 12); dias.push({ iso: d.toISOString().split('T')[0], dateObj: d, enMes: false }) } }
    return dias
  }

  const cambiarSemana = (direccion: number) => { const d = new Date(fechaSeleccionada + 'T12:00:00'); d.setDate(d.getDate() + (direccion * 7)); setFechaSeleccionada(d.toISOString().split('T')[0]) }
  const getMesYAnioTexto = (fechaStr: string) => { const d = new Date(fechaStr + 'T12:00:00'); const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']; return `${meses[d.getMonth()]} ${d.getFullYear()}` }
  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'NN'

  const getTelefonoPaciente = (id: string | null) => {
    const p = pacientes.find(x => x.id === id)
    return p ? String(p.telefono || '').replace(/\D/g, '') : ''
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = ('' + phone).replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) return '(' + match[1] + ') ' + match[2] + '-' + match[3]
    return phone
  }

  const getTextoUltimaVisita = (id: string, ultimasVisitasDict: any) => {
    const u = ultimasVisitasDict[id]
    if (!u) return 'Nuevo paciente'
    const dias = Math.floor((new Date().getTime() - u.getTime()) / (1000 * 3600 * 24))
    if (dias === 0) return 'Hoy'
    if (dias === 1) return 'Ayer'
    if (dias < 30) return `Hace ${dias} días`
    return `Hace ${Math.floor(dias / 30)} meses`
  }

  const getOriginalCitasCount = (dateStr: string) => citas.filter(c => c.fecha_cita === dateStr && c.estado !== 'cancelada' && c.estado !== 'ausente').length

  useEffect(() => {
    const verificarSesion = async () => {
      const estado = await obtenerEstadoSesion()
      if (estado.tipo === 'sin_sesion') { window.location.href = '/login'; return }
      if (estado.tipo !== 'activa') { window.location.href = '/login'; return }
      setSesion(estado.sesion)
      await cargarDatos(estado.sesion.esFullAccess)
    }
    verificarSesion()
  }, [])

  const cargarDatos = async (esFullAccess: boolean) => {
    const consultas = [
      supabase.from('pacientes').select('*').order('fecha_registro', { ascending: false }),
      supabase.from('citas').select('*').order('hora_cita', { ascending: true }),
      supabase.from('pagos').select('*').order('fecha', { ascending: false }),
      supabase.from('pago_productos').select('*'),
    ] as const
    const [{ data: pData }, { data: cData }, { data: payData }, { data: ppData }] = await Promise.all(consultas)
    if (pData) setPacientes(pData as Paciente[])
    if (cData) setCitas(cData as Cita[])
    if (payData) setPagos(payData as Pago[])
    if (ppData) setPagoProductos(ppData as PagoProducto[])

    if (esFullAccess) {
      const [{ data: iData }, { data: gData }] = await Promise.all([
        supabase.from('inventario').select('*'),
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
      ])
      if (iData) setInventario(iData as Producto[])
      if (gData) setGastos(gData as Gasto[])
    }
    setLoading(false)
  }

  const cerrarSesion = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  const regenerarLinkCalendario = async () => {
    if (!window.confirm('El link anterior dejará de funcionar. ¿Generar uno nuevo?')) return
    setRegenerandoToken(true)
    const { data, error } = await supabase.rpc('regenerar_calendar_token')
    if (!error && data && sesion) {
      setSesion({ ...sesion, usuario: { ...sesion.usuario, calendar_token: data } })
      mostrarToast('Nuevo link generado', 'exito')
    } else mostrarToast('No se pudo generar el link', 'error')
    setRegenerandoToken(false)
  }

  const esFullAccess = sesion?.esFullAccess ?? false

  // ============================================================================
  // COLAS DE TRABAJO (SALA DE ESPERA Y CAJA)
  // ============================================================================
  const pacientesEnEspera = useMemo(() => citas.filter(c => c.estado === 'en_espera' && c.fecha_cita === hoyFechaFormat), [citas, hoyFechaFormat])
  const pacientesEnCaja = useMemo(() => pagos.filter(p => p.estado === 'pendiente_pago'), [pagos])

  // ============================================================================
  // AGENDA INTELIGENTE Y ACCIONES
  // ============================================================================
  const timeToMins = (timeStr: string) => { const [h, m] = timeStr.split(':').map(Number); return h * 60 + m }

  const hayColisionCita = useMemo(() => {
    if (!formCita.fecha || !formCita.hora) return false
    const nInicio = timeToMins(formCita.hora); const nFin = nInicio + DURACION_POR_TIPO[formCita.tipo]
    return citas.some(c => {
      if (c.fecha_cita !== formCita.fecha || c.estado === 'cancelada' || c.estado === 'ausente') return false
      const eInicio = timeToMins(c.hora_cita.substring(0, 5)); const eFin = eInicio + c.duracion_min
      return (nInicio < eFin && nFin > eInicio)
    })
  }, [formCita.fecha, formCita.hora, formCita.tipo, citas])

  const abrirAgendadorRapido = (fecha: string, hora: string) => { setFormCita({ paciente_id: '', fecha, hora, tipo: 'seguimiento', repeticion: 1 }); setShowModalAgendar(true) }

  const agendarNuevaCita = async () => {
    if (hayColisionCita) return mostrarToast('Existe un conflicto de horario.', 'error')
    const esBloqueo = formCita.tipo === 'bloqueo'
    if (!esBloqueo && !formCita.paciente_id) return mostrarToast('Selecciona un paciente.', 'advertencia')
    if (!formCita.fecha || !formCita.hora) return mostrarToast('Completa la fecha y hora.', 'advertencia')

    let nombrePaciente = 'Bloqueo Personal'
    if (!esBloqueo) { const pSelec = pacientes.find(p => p.id === formCita.paciente_id); if (pSelec) nombrePaciente = pSelec.nombre_completo }

    const citasParaInsertar = []
    const fechaBase = new Date(formCita.fecha + 'T12:00:00')
    for (let i = 0; i < formCita.repeticion; i++) {
      const d = new Date(fechaBase.getTime()); d.setDate(d.getDate() + (i * 7))
      citasParaInsertar.push({
        paciente_id: esBloqueo ? null : formCita.paciente_id,
        nombre_paciente: nombrePaciente,
        fecha_cita: d.toISOString().split('T')[0],
        hora_cita: formCita.hora,
        duracion_min: DURACION_POR_TIPO[formCita.tipo],
        tipo: formCita.tipo,
        estado: 'programada' as EstadoCita,
        created_by: sesion?.usuario.id,
      })
    }

    const { error } = await supabase.from('citas').insert(citasParaInsertar)
    if (!error) { await cargarDatos(esFullAccess); setShowModalAgendar(false); setFormCita({ paciente_id: '', fecha: '', hora: '', tipo: 'seguimiento', repeticion: 1 }); mostrarToast(esBloqueo ? 'Agenda bloqueada' : 'Cita agendada', 'exito') } else mostrarToast('Error: ' + error.message, 'error')
  }

  const guardarEdicionCita = async () => {
    if (!citaSeleccionada) return
    const nInicio = timeToMins(formEdicion.hora); const nFin = nInicio + DURACION_POR_TIPO[formEdicion.tipo]
    const colision = citas.some(c => {
      if (c.id === citaSeleccionada.id) return false
      if (c.fecha_cita !== formEdicion.fecha || c.estado === 'cancelada' || c.estado === 'ausente') return false
      const eInicio = timeToMins(c.hora_cita.substring(0, 5)); const eFin = eInicio + c.duracion_min
      return (nInicio < eFin && nFin > eInicio)
    })

    if (colision) return mostrarToast('Ese horario ya está ocupado.', 'error')

    const { error } = await supabase.from('citas').update({ fecha_cita: formEdicion.fecha, hora_cita: formEdicion.hora, tipo: formEdicion.tipo, duracion_min: DURACION_POR_TIPO[formEdicion.tipo] }).eq('id', citaSeleccionada.id)
    if (!error) { await cargarDatos(esFullAccess); setModoEdicionCita(false); setCitaSeleccionada(null); mostrarToast('Cita actualizada exitosamente', 'exito') } else mostrarToast('Error de red', 'error')
  }

  const cancelarCita = async (idCita: string) => {
    if (!window.confirm('¿Confirmas que deseas CANCELAR esta cita?')) return
    const { error } = await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', idCita)
    if (!error) { await cargarDatos(esFullAccess); setCitaSeleccionada(null); mostrarToast('Cita cancelada', 'exito') }
  }

  const marcarAusente = async (idCita: string) => {
    if (!window.confirm('¿Marcar a este paciente como Ausente (No-Show)?')) return
    const { error } = await supabase.from('citas').update({ estado: 'ausente' }).eq('id', idCita)
    if (!error) { await cargarDatos(esFullAccess); setCitaSeleccionada(null); mostrarToast('Marcado como Ausente', 'advertencia') }
  }

  const hacerCheckInRapido = async (idCita: string, pNombre: string) => {
    const { error } = await supabase.from('citas').update({ estado: 'en_espera' }).eq('id', idCita)
    if (!error) { await cargarDatos(esFullAccess); setCitaSeleccionada(null); mostrarToast(`${pNombre} en Sala de Espera`, 'exito'); enviarNotificacionEscritorio('Check-In', `${pNombre} ya llegó.`) }
  }

  // ============================================================================
  // ESTELA BI: INTELIGENCIA DE NEGOCIO Y CRM
  // ============================================================================
  const biDatos = useMemo(() => {
    const hoy = new Date()
    const citasDelMesActual = citas.filter(c => { const fT = extraerFechaLocal(c.fecha_cita); return fT && fT.getMonth() === hoy.getMonth() && fT.getFullYear() === hoy.getFullYear() })
    const citasCanceladasMes = citasDelMesActual.filter(c => c.estado === 'cancelada' || c.estado === 'ausente').length
    const porcentajeAusentismo = citasDelMesActual.length > 0 ? ((citasCanceladasMes / citasDelMesActual.length) * 100).toFixed(1) : '0.0'

    const pagosFiltrados = pagos.filter(p => {
      if (p.estado !== 'pagado') return false
      const fT = extraerFechaLocal(p.fecha); if (!fT) return false
      if (filtroTiempo === 'Mes Actual') return fT.getMonth() === hoy.getMonth() && fT.getFullYear() === hoy.getFullYear()
      if (filtroTiempo === 'Mes Anterior') { const mAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1); return fT.getMonth() === mAnt.getMonth() && fT.getFullYear() === mAnt.getFullYear() }
      if (filtroTiempo === 'Últimos 3 Meses') return fT >= new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate())
      return true
    })

    let ingresosTotales = 0, ingresosFarmacia = 0
    const conteoProductos = new Map(), tendenciaDiariaMap = new Map()
    const mapaInv = new Map(inventario.map(i => [i.id, i]))
    const idsPagosFiltrados = new Set(pagosFiltrados.map(p => p.id))

    pagosFiltrados.forEach(p => {
      const total = p.monto_efectivo + p.monto_tarjeta + p.monto_transferencia
      ingresosTotales += total
      const fT = extraerFechaLocal(p.fecha)
      if (fT) { const dC = `${fT.getDate()}/${fT.getMonth() + 1}`; tendenciaDiariaMap.set(dC, (tendenciaDiariaMap.get(dC) || 0) + total) }
    })

    pagoProductos.filter(pp => idsPagosFiltrados.has(pp.pago_id)).forEach(pp => {
      const prod = mapaInv.get(pp.producto_id || '')
      ingresosFarmacia += pp.precio_unit * pp.cantidad
      if (prod) conteoProductos.set(prod.producto, (conteoProductos.get(prod.producto) || 0) + pp.cantidad)
    })

    const ingresosServicios = Math.max(0, ingresosTotales - ingresosFarmacia)
    const tendencia = Array.from(tendenciaDiariaMap, ([dia, total]) => ({ dia, total })).reverse()
    const topFarmacia = Array.from(conteoProductos, ([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)

    const ultimasVisitasDict: Record<string, Date> = {}
    pagos.forEach(p => {
      if (p.estado !== 'pagado' || !p.paciente_id) return
      const f = extraerFechaLocal(p.fecha)
      if (f && (!ultimasVisitasDict[p.paciente_id] || f > ultimasVisitasDict[p.paciente_id])) ultimasVisitasDict[p.paciente_id] = f
    })

    const alertasCRM = pacientes.map(p => {
      const u = ultimasVisitasDict[p.id]; if (!u) return null
      const dias = Math.floor((hoy.getTime() - u.getTime()) / (1000 * 3600 * 24))
      return dias > 30 ? { ...p, dias_ausente: dias } : null
    }).filter(Boolean).sort((a: any, b: any) => b.dias_ausente - a.dias_ausente)

    const hoyMes = String(hoy.getMonth() + 1).padStart(2, '0'); const hoyDia = String(hoy.getDate()).padStart(2, '0')
    const cumpleaneros = pacientes.filter(p => String(p.fecha_nacimiento || '').includes(`-${hoyMes}-${hoyDia}`))

    const totalGastos = gastos.filter(g => {
      const fT = extraerFechaLocal(g.fecha); if (!fT) return false
      if (filtroTiempo === 'Mes Actual') return fT.getMonth() === hoy.getMonth() && fT.getFullYear() === hoy.getFullYear()
      if (filtroTiempo === 'Mes Anterior') { const mAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1); return fT.getMonth() === mAnt.getMonth() && fT.getFullYear() === mAnt.getFullYear() }
      if (filtroTiempo === 'Últimos 3 Meses') return fT >= new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate())
      return true
    }).reduce((acc, g) => acc + Number(g.monto), 0)

    return {
      kpis: { ingresosTotales, ingresosServicios, ingresosFarmacia, totalTrx: pagosFiltrados.length, porcentajeAusentismo, citasCanceladasMes, totalGastos, utilidadNeta: ingresosTotales - totalGastos },
      tendencia, maxTendencia: tendencia.length ? Math.max(...tendencia.map(d => d.total)) : 1,
      topFarmacia, maxFarmacia: topFarmacia.length ? Math.max(...topFarmacia.map(p => p.cantidad)) : 1,
      alertasCRM, ultimasVisitasDict, cumpleaneros,
    }
  }, [pagos, pacientes, inventario, pagoProductos, citas, gastos, filtroTiempo])

  const registrarGasto = async () => {
    if (!formGasto.concepto.trim() || !Number(formGasto.monto)) return mostrarToast('Completa concepto y monto.', 'advertencia')
    const { error } = await supabase.from('gastos').insert([{ ...formGasto, monto: Number(formGasto.monto), created_by: sesion?.usuario.id }])
    if (!error) { await cargarDatos(esFullAccess); setFormGasto({ ...formGasto, concepto: '', monto: '' }); mostrarToast('Gasto registrado', 'exito') } else mostrarToast('Error: ' + error.message, 'error')
  }

  // ============================================================================
  // PROCESAMIENTO DE COBRO (CAJA)
  // ============================================================================
  const finalizarCobroEnRecepcion = async () => {
    if (!cobroActivo) return
    setProcesandoCobro(true)
    if (totalPagadoModal < totalEsperadoModal) { mostrarToast('Monto incompleto', 'advertencia'); setProcesandoCobro(false); return }

    const { error } = await supabase.from('pagos').update({
      monto_efectivo: Number(formCobro.efectivo) || 0,
      monto_tarjeta: Number(formCobro.tarjeta) || 0,
      monto_transferencia: Number(formCobro.transferencia) || 0,
      requiere_factura: formCobro.requiereFactura,
      estado: 'pagado',
    }).eq('id', cobroActivo.id)

    if (!error) {
      const productosVendidos = pagoProductos.filter(pp => pp.pago_id === cobroActivo.id)
      const nombresProdsVenta: string[] = []
      for (const pp of productosVendidos) {
        const prod = inventario.find(i => i.id === pp.producto_id)
        if (prod) {
          nombresProdsVenta.push(prod.producto)
          await supabase.from('inventario').update({ stock: prod.stock - pp.cantidad }).eq('id', prod.id)
        }
      }

      const metodosArray = []
      if (Number(formCobro.efectivo) > 0) metodosArray.push('Efectivo')
      if (Number(formCobro.tarjeta) > 0) metodosArray.push('Tarjeta')
      if (Number(formCobro.transferencia) > 0) metodosArray.push('Transf.')

      if (formCobro.recibo === 'pdf') {
        mostrarToast('Generando Ticket PDF...', 'exito')
        setTimeout(() => window.print(), 1000)
      } else if (formCobro.recibo === 'whatsapp') {
        const pacienteInfo = pacientes.find(p => p.id === cobroActivo.paciente_id)
        if (pacienteInfo?.telefono) {
          let texto = `*Clínica Marla - Ticket de Servicio* 🌿\n\nHola *${pacienteInfo.nombre_completo}*, tu pago se procesó exitosamente.\n\n🩺 *Servicio:* ${cobroActivo.concepto || ''}\n`
          if (nombresProdsVenta.length > 0) { texto += `\n*Suplementos:*\n`; nombresProdsVenta.forEach(n => texto += `💊 ${n}\n`) }
          texto += `\n*Total Abonado:* $${totalEsperadoModal.toLocaleString()}\n💳 *Pago:* ${metodosArray.join(', ')}\n`
          if (formCobro.requiereFactura) texto += `\n📌 _Tu factura CFDI será enviada a tu correo registrado en breve._\n`
          texto += `\n¡Gracias por tu visita! ✨`
          setUrlWhatsAppPendiente(`https://wa.me/${String(pacienteInfo.telefono).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`)
        }
      }
      await cargarDatos(esFullAccess); setCobroActivo(null); setFormCobro({ efectivo: '', tarjeta: '', transferencia: '', requiereFactura: false, recibo: 'whatsapp' })
      if (formCobro.recibo !== 'pdf') mostrarToast('Cobro procesado con éxito', 'exito')
    } else mostrarToast('Error de red: ' + error.message, 'error')
    setProcesandoCobro(false)
  }

  const pacientesFiltrados = pacientes.filter(p => p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()))
  const diasSemanales = obtenerDiasSemana(fechaSeleccionada)
  const citasManana = citas.filter(c => c.fecha_cita === mananaFechaFormat && c.estado !== 'cancelada' && c.estado !== 'ausente' && c.tipo !== 'bloqueo')

  const pacienteCitaSeleccionada = citaSeleccionada && citaSeleccionada.tipo !== 'bloqueo' ? pacientes.find(p => p.id === citaSeleccionada.paciente_id) : null
  const telefonoLimpioCita = pacienteCitaSeleccionada?.telefono ? String(pacienteCitaSeleccionada.telefono).replace(/\D/g, '') : null

  if (loading || !sesion) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><p className="animate-pulse font-bold text-[#0066FF]">Cargando plataforma...</p></div>

  return (
    <div className="flex h-dvh md:h-screen bg-[#F4F6F9] font-sans text-slate-800 overflow-hidden">

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className={`px-6 py-3.5 rounded-full shadow-xl font-bold text-sm text-white flex items-center gap-2 ${toast.tipo === 'exito' ? 'bg-[#00D084]' : toast.tipo === 'error' ? 'bg-rose-500' : 'bg-amber-500 text-slate-900'}`}>
            <span>{toast.tipo === 'exito' ? '✅' : toast.tipo === 'error' ? '🛑' : '⚠️'}</span> {toast.mensaje}
          </div>
        </div>
      )}

      {/* MODAL: DETALLES DE CITA Y ACCIONES RÁPIDAS */}
      {citaSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCitaSeleccionada(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-slate-200" onClick={e => e.stopPropagation()}>

            <div className={`p-6 text-white ${citaSeleccionada.tipo === 'bloqueo' ? 'bg-slate-600' :
              (new Date(`${citaSeleccionada.fecha_cita}T${citaSeleccionada.hora_cita}`) < horaActual && citaSeleccionada.estado === 'programada' && citaSeleccionada.fecha_cita === hoyFechaFormat) ? 'bg-rose-500' : 'bg-[#0066FF]'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="bg-white/20 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {citaSeleccionada.estado === 'programada' && new Date(`${citaSeleccionada.fecha_cita}T${citaSeleccionada.hora_cita}`) < horaActual && citaSeleccionada.fecha_cita === hoyFechaFormat ? '⚠️ Retraso Detectado' : citaSeleccionada.estado}
                </span>
                <button onClick={() => setCitaSeleccionada(null)} className="text-white/70 hover:text-white font-bold text-xl leading-none transition-colors">&times;</button>
              </div>
              <h3 className="text-2xl font-black mb-1 leading-tight">{citaSeleccionada.nombre_paciente}</h3>
              <p className="text-sm font-medium opacity-90">{ETIQUETA_TIPO_CITA[citaSeleccionada.tipo]}</p>
            </div>

            <div className="p-6">
              {modoEdicionCita ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tipo de Cita</label>
                    <select value={formEdicion.tipo} onChange={e => setFormEdicion({ ...formEdicion, tipo: e.target.value as TipoCita })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF]">
                      {(Object.keys(ETIQUETA_TIPO_CITA) as TipoCita[]).filter(t => t !== 'bloqueo').map(t => <option key={t} value={t}>{ETIQUETA_TIPO_CITA[t]}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Fecha</label>
                      <input type="date" value={formEdicion.fecha} onChange={e => setFormEdicion({ ...formEdicion, fecha: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hora</label>
                      <input type="time" value={formEdicion.hora} onChange={e => setFormEdicion({ ...formEdicion, hora: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF]" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setModoEdicionCita(false)} className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200">Cancelar</button>
                    <button onClick={guardarEdicionCita} className="flex-1 bg-[#0066FF] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700">💾 Guardar Cambios</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl">📅</div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</p>
                      <p className="text-sm font-black text-slate-800">
                        {new Date(citaSeleccionada.fecha_cita + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                        <br />
                        <span className="text-[#0066FF]">
                          {citaSeleccionada.hora_cita.substring(0, 5)} - {
                            (() => {
                              const minFinal = timeToMins(citaSeleccionada.hora_cita.substring(0, 5)) + citaSeleccionada.duracion_min
                              return `${String(Math.floor(minFinal / 60)).padStart(2, '0')}:${String(minFinal % 60).padStart(2, '0')}`
                            })()
                          } hrs
                        </span>
                        <span className="text-slate-400 font-medium text-[10px]"> ({citaSeleccionada.duracion_min} min)</span>
                      </p>
                    </div>
                  </div>

                  {pacienteCitaSeleccionada && (
                    <div className="flex items-center justify-between gap-4 text-slate-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">📱</div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Contacto</p>
                          <p className="text-sm font-black text-emerald-900">{formatPhoneNumber(pacienteCitaSeleccionada.telefono || '')}</p>
                        </div>
                      </div>
                      {telefonoLimpioCita && (
                        <a href={`https://wa.me/${telefonoLimpioCita}?text=${encodeURIComponent(`Hola ${citaSeleccionada.nombre_paciente}, te escribimos de Clínica Marla para verificar si vienes en camino a tu cita de las ${citaSeleccionada.hora_cita.substring(0, 5)}. ¡Te esperamos! 🌿`)}`} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-sm hover:bg-[#128C7E] transition-colors flex items-center gap-1">
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {citaSeleccionada.tipo === 'bloqueo' ? (
                      <button onClick={() => cancelarCita(citaSeleccionada.id)} className="col-span-2 py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-colors border border-rose-100">
                        🗑️ Liberar Bloqueo
                      </button>
                    ) : (
                      <>
                        {citaSeleccionada.estado === 'programada' && (
                          <button onClick={() => hacerCheckInRapido(citaSeleccionada.id, citaSeleccionada.nombre_paciente || '')} className="col-span-2 py-3.5 bg-[#00D084] text-white rounded-xl text-sm font-black hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2 mb-2">
                            📍 Registrar Llegada (Check-In)
                          </button>
                        )}
                        {citaSeleccionada.estado === 'en_espera' && esFullAccess && (
                          <Link href={`/paciente/${citaSeleccionada.paciente_id}`} className="col-span-2 py-3.5 flex items-center justify-center gap-2 bg-[#0066FF] text-white rounded-xl text-sm font-black shadow-md hover:bg-blue-700 transition-colors mb-2">
                            🩺 Iniciar Consulta Médica
                          </Link>
                        )}

                        <Link href={`/paciente/${citaSeleccionada.paciente_id}`} className="py-2.5 flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold border border-slate-200 hover:bg-slate-100 transition-colors">
                          👤 Expediente
                        </Link>
                        <button onClick={() => setModoEdicionCita(true)} className="py-2.5 flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold border border-slate-200 hover:bg-slate-100 transition-colors">
                          ✏️ Modificar
                        </button>

                        <button onClick={() => marcarAusente(citaSeleccionada.id)} className="py-2.5 flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold border border-amber-200 hover:bg-amber-100 transition-colors">
                          👻 No Show
                        </button>
                        <button onClick={() => cancelarCita(citaSeleccionada.id)} className="py-2.5 flex items-center justify-center gap-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold border border-rose-200 hover:bg-rose-100 transition-colors">
                          ❌ Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {urlWhatsAppPendiente && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm text-center animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-2">¡Cobro Registrado!</h3>
            <p className="text-sm text-slate-500 mb-6">¿Deseas enviar el Ticket Digital al paciente?</p>
            <button onClick={() => { window.open(urlWhatsAppPendiente, '_blank'); setUrlWhatsAppPendiente(null) }} className="w-full bg-[#25D366] text-white font-black py-3.5 rounded-xl shadow-md mb-2 hover:bg-[#128c7e] transition-colors">📱 Enviar WhatsApp</button>
            <button onClick={() => setUrlWhatsAppPendiente(null)} className="w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">Omitir</button>
          </div>
        </div>
      )}

      {cobroActivo && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black mb-1">Check-Out: {pacientes.find(p => p.id === cobroActivo.paciente_id)?.nombre_completo || 'Paciente'}</h3>
            <p className="text-sm text-slate-500 mb-6">{cobroActivo.concepto}</p>

            <div className="bg-blue-50 text-[#0066FF] rounded-xl p-6 text-center mb-6 border border-blue-100">
              <p className="text-xs font-black uppercase tracking-widest mb-1">Total a Cobrar</p>
              <p className="text-4xl font-black">${totalEsperadoModal.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[{ id: 'efectivo', label: 'Efectivo', val: formCobro.efectivo }, { id: 'tarjeta', label: 'Tarjeta', val: formCobro.tarjeta }, { id: 'transferencia', label: 'Transf.', val: formCobro.transferencia }].map(m => (
                <div key={m.id} className="border border-slate-200 p-3 rounded-xl focus-within:border-[#0066FF] transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-2">{m.label}</p>
                  <input type="number" value={m.val} onChange={e => setFormCobro({ ...formCobro, [m.id]: e.target.value })} className="w-full text-center text-sm font-bold outline-none" placeholder="$0" />
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <p className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-widest">Emisión de Comprobante</p>
              <div className="flex gap-2 mb-4">
                <button className={`flex-1 p-2 rounded-lg text-[10px] font-bold border transition-colors ${formCobro.recibo === 'whatsapp' ? 'bg-[#25D366] text-white border-[#25D366] shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`} onClick={() => setFormCobro({ ...formCobro, recibo: 'whatsapp' })}>📱 WhatsApp</button>
                <button className={`flex-1 p-2 rounded-lg text-[10px] font-bold border transition-colors ${formCobro.recibo === 'pdf' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`} onClick={() => setFormCobro({ ...formCobro, recibo: 'pdf' })}>📄 Imprimir (PDF)</button>
                <button className={`flex-1 p-2 rounded-lg text-[10px] font-bold border transition-colors ${formCobro.recibo === 'ninguno' ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-white text-slate-500 hover:bg-slate-100'}`} onClick={() => setFormCobro({ ...formCobro, recibo: 'ninguno' })}>❌ Ninguno</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-[#0066FF] transition-colors" onClick={() => setFormCobro({ ...formCobro, requiereFactura: !formCobro.requiereFactura })}>
                <div>
                  <p className="text-sm font-bold text-slate-800">¿Generar Factura (CFDI)?</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Se pedirán los datos fiscales al paciente.</p>
                </div>
                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formCobro.requiereFactura ? 'bg-[#0066FF]' : 'bg-slate-200'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${formCobro.requiereFactura ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>

            {totalPagadoModal > 0 && balanceModal < 0 && <p className="text-rose-500 text-xs font-bold text-center mb-4">Faltan ${Math.abs(balanceModal).toLocaleString()}</p>}
            {totalPagadoModal > 0 && balanceModal >= 0 && <p className="text-[#00D084] text-xs font-bold text-center mb-4">Cambio a entregar: ${balanceModal.toLocaleString()}</p>}

            <div className="flex gap-3">
              <button onClick={() => setCobroActivo(null)} className="px-5 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={finalizarCobroEnRecepcion} disabled={procesandoCobro || balanceModal < 0} className="flex-1 bg-[#0066FF] text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {procesandoCobro ? 'Procesando...' : 'Completar y Emitir Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalAgendar && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-6 text-slate-800">Agendar Cita</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Tipo de Cita</label>
                <select value={formCita.tipo} onChange={e => setFormCita({ ...formCita, tipo: e.target.value as TipoCita })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer">
                  {(Object.keys(ETIQUETA_TIPO_CITA) as TipoCita[]).map(t => (
                    <option key={t} value={t}>{t === 'bloqueo' ? '🛑 Bloqueo de Horario (Personal)' : `${ETIQUETA_TIPO_CITA[t]} (${DURACION_POR_TIPO[t]} min)`}</option>
                  ))}
                </select>
              </div>

              {formCita.tipo !== 'bloqueo' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Paciente</label>
                  <select value={formCita.paciente_id} onChange={e => setFormCita({ ...formCita, paciente_id: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer">
                    <option value="">Selecciona paciente...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Fecha</label>
                  <input type="date" value={formCita.fecha} onChange={e => setFormCita({ ...formCita, fecha: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Hora Inicio</label>
                  <input type="time" value={formCita.hora} onChange={e => setFormCita({ ...formCita, hora: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer" />
                </div>
              </div>

              {formCita.tipo !== 'bloqueo' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Repetición Semanal</label>
                  <select value={formCita.repeticion} onChange={e => setFormCita({ ...formCita, repeticion: Number(e.target.value) })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer">
                    <option value="1">Solo esta vez</option>
                    <option value="2">2 Semanas Seguidas</option>
                    <option value="3">3 Semanas Seguidas</option>
                    <option value="4">4 Semanas Seguidas (1 Mes)</option>
                  </select>
                </div>
              )}
            </div>

            {hayColisionCita && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-bold text-rose-600 mb-4 animate-in fade-in flex gap-2"><span>⚠️</span> Horario ocupado por duración.</div>}

            <div className="flex gap-3">
              <button onClick={() => setShowModalAgendar(false)} className="px-5 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={agendarNuevaCita} disabled={hayColisionCita} className="flex-1 bg-[#0066FF] text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">Guardar en Agenda</button>
            </div>
          </div>
        </div>
      )}

      {showModalCalendario && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModalCalendario(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-[#0066FF]/10 text-[#0066FF] rounded-2xl flex items-center justify-center text-2xl mb-4">📆</div>
            <h3 className="text-xl font-black text-slate-800 mb-1">Sincronizar con tu iPhone</h3>
            <p className="text-sm text-slate-500 mb-6">Verás tu agenda de la clínica directo en la app Calendario de tu iPhone. Se actualiza sola cada rato (no es instantáneo, pero no tienes que hacer nada más).</p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Paso 1</p>
              <a
                href={`webcal://${typeof window !== 'undefined' ? window.location.host : ''}/api/calendario/${sesion.usuario.calendar_token}`}
                className="block w-full text-center bg-[#0066FF] text-white font-black py-3 rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
              >
                Agregar a Calendario (iPhone) →
              </a>
              <p className="text-[11px] text-slate-400 mt-2">Si el botón no abre nada automáticamente, copia este link y pégalo en Ajustes → Calendario → Cuentas → Añadir cuenta suscrita:</p>
              <div className="mt-2 flex gap-2">
                <input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendario/${sesion.usuario.calendar_token}`}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 outline-none"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/calendario/${sesion.usuario.calendar_token}`); mostrarToast('Link copiado', 'exito') }}
                  className="bg-slate-800 text-white text-xs font-bold px-3 rounded-lg hover:bg-slate-900 transition-colors shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-4">Este link es personal y privado — no lo compartas. Si crees que alguien más lo tiene, genera uno nuevo.</p>

            <div className="flex gap-3">
              <button onClick={() => setShowModalCalendario(false)} className="px-5 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm">Cerrar</button>
              <button onClick={regenerarLinkCalendario} disabled={regenerandoToken} className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold hover:bg-rose-100 transition-colors text-sm disabled:opacity-50">
                {regenerandoToken ? 'Generando...' : 'Generar link nuevo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR IZQUIERDO */}
      <aside className="hidden md:flex w-[72px] bg-white border-r border-slate-200 flex-col items-center py-6 shrink-0 z-20">
        <div className="w-10 h-10 bg-[#0066FF] rounded-lg flex items-center justify-center text-white font-black text-xl mb-8 shadow-sm">M</div>

        <nav className="flex-1 flex flex-col gap-4 w-full px-3">
          <button onClick={() => setActiveTab('Mi Consultorio')} title="Agenda Clínica" className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${activeTab === 'Mi Consultorio' ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>📅</button>
          <button onClick={() => setActiveTab('Pacientes')} title="Directorio" className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${activeTab === 'Pacientes' ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>👥</button>
          {esFullAccess && (
            <>
              <button onClick={() => setActiveTab('Finanzas')} title="Estela BI (Reportes)" className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${activeTab === 'Finanzas' ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>📊</button>
              <button onClick={() => setActiveTab('Almacen')} title="Farmacia" className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${activeTab === 'Almacen' ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>📦</button>
              <Link href="/usuarios" title="Usuarios y Accesos" className="w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all text-slate-400 hover:bg-slate-50 hover:text-slate-600">⚙️</Link>
            </>
          )}
        </nav>

        <button onClick={cerrarSesion} title="Cerrar Sesión" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors mt-auto font-bold text-sm">
          {getInitials(sesion.usuario.nombre)}
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col h-dvh md:h-screen overflow-hidden bg-slate-50/50">

        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-slate-800 font-black text-lg">Clínica Marla</span>
            <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">{esFullAccess ? 'Acceso Total' : 'Personal Administrativo'}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/registro" className="text-[#0066FF] font-bold text-sm hover:underline flex items-center gap-1"><span className="hidden sm:inline">+ Nuevo Paciente</span><span className="sm:hidden text-lg leading-none">+</span></Link>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="relative">
              <button onClick={() => setShowMenuPerfil(!showMenuPerfil)} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-[#0066FF]">{getInitials(sesion.usuario.nombre)}</div>
                <span className="text-sm font-bold text-slate-700 hidden sm:inline pr-1">{sesion.usuario.nombre}</span>
                <span className="text-slate-400 text-[10px] hidden sm:inline">▾</span>
              </button>
              {showMenuPerfil && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenuPerfil(false)}></div>
                  <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-20 overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="p-4 border-b border-slate-100">
                      <p className="text-sm font-black text-slate-800 truncate">{sesion.usuario.nombre}</p>
                      <p className="text-xs text-slate-400 truncate">{sesion.usuario.email}</p>
                    </div>
                    <button onClick={() => { setShowModalCalendario(true); setShowMenuPerfil(false) }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors">
                      📆 Sincronizar con iPhone
                    </button>
                    {esFullAccess && (
                      <Link href="/usuarios" className="block px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors">
                        ⚙️ Usuarios y Accesos
                      </Link>
                    )}
                    <button onClick={cerrarSesion} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2.5 transition-colors border-t border-slate-100">
                      🚪 Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">

          {/* VISTA 1: AGENDA Y WORKLIST */}
          {activeTab === 'Mi Consultorio' && (
            <>
            <div className="hidden md:flex flex-1 w-full h-full overflow-hidden">

              <div className="flex-1 flex flex-col bg-white m-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border-b border-slate-200 gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      <button onClick={() => cambiarSemana(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:text-slate-800 font-bold transition-colors">&lt;</button>
                      <button onClick={() => cambiarSemana(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:text-slate-800 font-bold transition-colors">&gt;</button>
                    </div>
                    <h2 className="text-lg font-black text-slate-800">
                      {vistaAgenda === 'Semana' ? `${diasSemanales[0].dateObj.getDate()} al ${diasSemanales[6].dateObj.getDate()} ${getMesYAnioTexto(fechaSeleccionada)}` : `${new Date(fechaSeleccionada + 'T12:00:00').getDate()} ${getMesYAnioTexto(fechaSeleccionada)}`}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setFechaSeleccionada(hoyFechaFormat)} className="text-xs font-bold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 bg-white">Hoy</button>
                    <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200">
                      <button onClick={() => setVistaAgenda('Dia')} className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${vistaAgenda === 'Dia' ? 'bg-white shadow-sm text-[#0066FF]' : 'text-slate-500 hover:text-slate-700'}`}>Día</button>
                      <button onClick={() => setVistaAgenda('Semana')} className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${vistaAgenda === 'Semana' ? 'bg-white shadow-sm text-[#0066FF]' : 'text-slate-500 hover:text-slate-700'}`}>Semana</button>
                    </div>
                    <button onClick={() => setShowModalAgendar(true)} className="bg-[#0066FF] text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-colors">+ Nueva Consulta</button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50/30">
                  <div className={`min-w-[800px] h-full flex flex-col`}>

                    <div className={`grid ${vistaAgenda === 'Semana' ? 'grid-cols-[80px_repeat(7,1fr)]' : 'grid-cols-[80px_1fr]'} border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm`}>
                      <div className="py-3 text-center text-[10px] font-black uppercase text-slate-400 border-r border-slate-100">Hora</div>
                      {vistaAgenda === 'Semana' ? diasSemanales.map((d, i) => (
                        <div key={i} className={`py-3 text-center border-r border-slate-100 ${d.iso === hoyFechaFormat ? 'text-[#0066FF] font-black bg-blue-50/30 border-b-2 border-b-[#0066FF]' : 'text-slate-600 font-bold border-b-2 border-transparent'}`}>
                          <span className="text-[10px] uppercase block leading-none opacity-60 mb-0.5">{DIAS_NOMBRES[i]}</span>
                          <span className="text-base leading-none">{d.dateObj.getDate()}</span>
                        </div>
                      )) : (
                        <div className="py-3 text-center text-[#0066FF] font-black bg-blue-50/30 border-r border-slate-100 flex flex-col justify-center border-b-2 border-b-[#0066FF]">
                          <span className="text-[10px] uppercase opacity-60 mb-0.5">{new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long' })}</span>
                          <span className="text-base">{new Date(fechaSeleccionada + 'T12:00:00').getDate()} {getMesYAnioTexto(fechaSeleccionada)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 relative pb-10">
                      {HORAS_SMART.map((hora) => (
                        <div key={hora} className={`grid ${vistaAgenda === 'Semana' ? 'grid-cols-[80px_repeat(7,1fr)]' : 'grid-cols-[80px_1fr]'} border-b border-slate-100 h-24 bg-white/50`}>
                          <div className="text-[10px] text-slate-400 font-bold text-center py-2 border-r border-slate-100 bg-white">{hora}</div>

                          {(vistaAgenda === 'Semana' ? diasSemanales.map(d => d.iso) : [fechaSeleccionada]).map((isoDate, colIdx) => {
                            const citasEnCelda = citas.filter(c => c.fecha_cita === isoDate && c.hora_cita.startsWith(hora.substring(0, 2)) && c.estado !== 'cancelada' && c.estado !== 'ausente')

                            return (
                              <div
                                key={colIdx}
                                className={`border-r border-slate-100 relative p-1 transition-colors cursor-pointer group hover:bg-slate-50 ${isoDate === hoyFechaFormat ? 'bg-blue-50/10' : 'bg-transparent'}`}
                                onClick={() => { if (citasEnCelda.length === 0) abrirAgendadorRapido(isoDate, hora) }}
                              >
                                {citasEnCelda.map(c => {
                                  const isCheckedIn = c.estado === 'en_espera'
                                  const isEnCaja = pacientesEnCaja.some(pg => pg.cita_id === c.id)
                                  const isTerminado = pagos.some(pg => pg.cita_id === c.id && pg.estado === 'pagado')
                                  const esBloqueo = c.tipo === 'bloqueo'

                                  const numBlocks = c.duracion_min / 60

                                  const dCita = new Date(`${c.fecha_cita}T${c.hora_cita}`)
                                  const isLate = dCita < horaActual && c.fecha_cita === hoyFechaFormat && !isCheckedIn && !isTerminado && !isEnCaja && !esBloqueo

                                  let bgClass = 'bg-blue-50 border-blue-400 text-blue-900'
                                  if (c.tipo === 'seguimiento') bgClass = 'bg-emerald-50 border-emerald-400 text-emerald-900'
                                  if (c.tipo === 'solo_inbody') bgClass = 'bg-orange-50 border-orange-400 text-orange-900'
                                  if (c.tipo === 'enzimas') bgClass = 'bg-purple-50 border-purple-400 text-purple-900'
                                  if (isTerminado) bgClass = 'bg-slate-100 border-slate-300 text-slate-500 opacity-60'
                                  if (isLate) bgClass = 'bg-rose-50 border-rose-500 text-rose-900 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'

                                  if (esBloqueo) {
                                    return (
                                      <div key={c.id} style={{ height: `calc(${numBlocks * 100}% - 4px)` }} onClick={(e) => { e.stopPropagation(); setCitaSeleccionada(c) }} className="absolute top-0.5 left-0.5 right-0.5 rounded bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#f1f5f9_10px,#f1f5f9_20px)] border border-slate-200 opacity-80 flex items-center justify-center hover:opacity-100 z-20 cursor-pointer">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-slate-100">Bloqueado</span>
                                      </div>
                                    )
                                  }

                                  return (
                                    <div
                                      key={c.id}
                                      style={{ height: `calc(${numBlocks * 100}% - 4px)` }}
                                      onClick={(e) => { e.stopPropagation(); setCitaSeleccionada(c) }}
                                      className={`absolute top-0.5 left-0.5 right-0.5 border-l-4 rounded p-1.5 shadow-sm overflow-hidden z-20 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer ${bgClass}`}
                                    >
                                      <div>
                                        <p className="font-bold text-[11px] leading-tight truncate">{c.nombre_paciente}</p>
                                        <p className="text-[9px] truncate opacity-80 mt-0.5 font-medium flex items-center gap-1">
                                          {isLate && <span>⚠️</span>} {ETIQUETA_TIPO_CITA[c.tipo]}
                                        </p>
                                      </div>
                                      <div className="flex items-center justify-between mt-1 text-[9px] font-black opacity-80">
                                        <span>{c.hora_cita.substring(0, 5)}</span>
                                        <div className="flex gap-1 text-xs">
                                          {isTerminado ? '✅' : isEnCaja ? '🛒' : isCheckedIn ? '🛋️' : isLate ? '⏳' : ''}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                                {citasEnCelda.length === 0 && <div className="absolute inset-1 border-2 border-dashed border-[#0066FF]/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#0066FF] text-xl font-black">+</div>}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-[320px] flex flex-col py-4 pr-6 gap-6 overflow-y-auto hidden lg:flex bg-white z-10 shrink-0 border-l border-slate-200">

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-black text-slate-800 capitalize">{getMesYAnioTexto(fechaSeleccionada)}</span>
                  </div>
                  <div className="grid grid-cols-7 gap-x-1 gap-y-2 text-center text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
                    {DIAS_NOMBRES.map(d => <div key={d}>{d[0]}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-x-1 gap-y-2 text-center text-xs font-bold">
                    {obtenerDiasMes(fechaSeleccionada).map((d, i) => {
                      const hasCitas = getOriginalCitasCount(d.iso) > 0
                      return (
                        <div
                          key={i}
                          onClick={() => { setFechaSeleccionada(d.iso); setVistaAgenda('Dia') }}
                          className={`w-9 h-9 flex flex-col items-center justify-center rounded-full mx-auto cursor-pointer relative transition-colors ${d.iso === fechaSeleccionada ? 'bg-[#0066FF] text-white shadow-md' : d.iso === hoyFechaFormat ? 'bg-blue-50 text-[#0066FF]' : d.enMes ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300'}`}
                        >
                          <span>{d.dateObj.getDate()}</span>
                          {hasCitas && d.iso !== fechaSeleccionada && <div className="absolute bottom-1 w-1 h-1 bg-amber-400 rounded-full"></div>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                    Flujo de Hoy <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{pacientesEnEspera.length + pacientesEnCaja.length} activos</span>
                  </h3>
                  <div className="space-y-3">
                    {pacientesEnEspera.length === 0 && pacientesEnCaja.length === 0 && (
                      <div className="bg-slate-50 rounded-xl p-5 text-center border border-slate-100">
                        <span className="text-xl opacity-40 block mb-1">🌿</span>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Clínica Despejada</p>
                      </div>
                    )}
                    {pacientesEnEspera.map(c => (
                      <div key={c.id} className="bg-white p-3.5 rounded-xl shadow-sm border border-sky-200 border-l-4 border-l-sky-500 relative">
                        <span className="absolute top-3 right-3 text-[9px] bg-sky-100 text-sky-700 font-black px-1.5 py-0.5 rounded uppercase">En Sala</span>
                        <p className="text-xs font-black text-slate-800 pr-12 truncate">{c.nombre_paciente}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">{ETIQUETA_TIPO_CITA[c.tipo]}</p>
                        {esFullAccess && <Link href={`/paciente/${c.paciente_id}`} className="mt-2.5 block text-center bg-sky-50 border border-sky-100 text-sky-700 text-[10px] font-bold py-1.5 rounded hover:bg-sky-500 hover:text-white transition-colors">Abrir Expediente</Link>}
                      </div>
                    ))}
                    {pacientesEnCaja.map(pg => (
                      <div key={pg.id} className="bg-white p-3.5 rounded-xl shadow-sm border border-amber-200 border-l-4 border-l-amber-500 relative">
                        <span className="absolute top-3 right-3 text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase animate-pulse">Por Cobrar</span>
                        <p className="text-xs font-black text-slate-800 pr-16 truncate">{pacientes.find(p => p.id === pg.paciente_id)?.nombre_completo || 'Paciente'}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold">Total: ${pg.monto_esperado}</p>
                        <button onClick={() => setCobroActivo(pg)} className="mt-2.5 w-full block text-center bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold py-1.5 rounded hover:bg-amber-500 hover:text-white transition-colors">Procesar Pago</button>
                      </div>
                    ))}
                  </div>
                </div>

                {!esFullAccess && (
                  <>
                    <hr className="border-slate-100" />
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                        Confirmar Mañana <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{citasManana.length} citas</span>
                      </h3>
                      {citasManana.length === 0 ? (
                        <div className="bg-slate-50 rounded-xl p-5 text-center border border-slate-100">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sin citas por confirmar</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {citasManana.map(c => {
                            const tel = getTelefonoPaciente(c.paciente_id)
                            const mensaje = `Hola ${c.nombre_paciente}, te confirmamos tu cita de ${ETIQUETA_TIPO_CITA[c.tipo]} el día de mañana a las ${c.hora_cita.substring(0, 5)} hrs con la Nutrióloga Marla.\n\nPor favor responde 1 para confirmar o 2 para reagendar. ¡Excelente día! 🌿`
                            return (
                              <div key={c.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors">
                                <p className="text-xs font-bold text-slate-800 truncate">{c.nombre_paciente}</p>
                                <p className="text-[9px] text-slate-500 mb-2 mt-0.5 font-bold">{c.hora_cita.substring(0, 5)} hrs • {ETIQUETA_TIPO_CITA[c.tipo]}</p>
                                {tel ? (
                                  <a href={`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`} target="_blank" className="flex items-center justify-center gap-1.5 w-full bg-[#25D366]/10 text-[#128C7E] text-[10px] font-black py-1.5 rounded-lg hover:bg-[#25D366] hover:text-white transition-colors">
                                    Confirmar por WhatsApp
                                  </a>
                                ) : (
                                  <span className="block w-full bg-slate-100 text-slate-400 text-[10px] font-bold py-1.5 rounded-lg text-center">Sin Teléfono</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* AGENDA MÓVIL: lista del día en vez de la cuadrícula semanal */}
            <div className="md:hidden flex-1 overflow-y-auto pb-24">
              <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-2 -mx-1">
                {diasSemanales.map((d, i) => {
                  const seleccionado = d.iso === fechaSeleccionada
                  const hasCitas = getOriginalCitasCount(d.iso) > 0
                  return (
                    <button
                      key={d.iso}
                      onClick={() => setFechaSeleccionada(d.iso)}
                      className={`shrink-0 w-14 py-2.5 rounded-2xl flex flex-col items-center gap-0.5 border transition-colors ${seleccionado ? 'bg-[#0066FF] border-[#0066FF] text-white shadow-md' : d.iso === hoyFechaFormat ? 'bg-blue-50 border-blue-100 text-[#0066FF]' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                      <span className="text-[9px] font-black uppercase opacity-70">{DIAS_NOMBRES[i]}</span>
                      <span className="text-base font-black leading-none">{d.dateObj.getDate()}</span>
                      <div className={`w-1 h-1 rounded-full mt-0.5 ${hasCitas ? (seleccionado ? 'bg-white' : 'bg-amber-400') : 'bg-transparent'}`}></div>
                    </button>
                  )
                })}
              </div>

              {fechaSeleccionada === hoyFechaFormat && (pacientesEnEspera.length > 0 || pacientesEnCaja.length > 0) && (
                <div className="px-4 pb-2 space-y-2.5">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Flujo de Hoy</h3>
                  {pacientesEnEspera.map(c => (
                    <div key={c.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-sky-200 border-l-4 border-l-sky-500 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{c.nombre_paciente}</p>
                        <p className="text-[10px] text-slate-500 font-medium">🛋️ En Sala de Espera</p>
                      </div>
                      {esFullAccess && <Link href={`/paciente/${c.paciente_id}`} className="shrink-0 bg-sky-50 border border-sky-100 text-sky-700 text-[10px] font-bold px-3 py-2 rounded-xl">Abrir</Link>}
                    </div>
                  ))}
                  {pacientesEnCaja.map(pg => (
                    <div key={pg.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-amber-200 border-l-4 border-l-amber-500 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{pacientes.find(p => p.id === pg.paciente_id)?.nombre_completo || 'Paciente'}</p>
                        <p className="text-[10px] text-slate-500 font-bold">Por cobrar: ${pg.monto_esperado}</p>
                      </div>
                      <button onClick={() => setCobroActivo(pg)} className="shrink-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-2 rounded-xl">Cobrar</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-4 pt-2 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800">
                  {new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>

              <div className="px-4 space-y-2.5">
                {citas
                  .filter(c => c.fecha_cita === fechaSeleccionada && c.estado !== 'cancelada' && c.estado !== 'ausente')
                  .sort((a, b) => a.hora_cita.localeCompare(b.hora_cita))
                  .map(c => {
                    const isCheckedIn = c.estado === 'en_espera'
                    const isTerminado = pagos.some(pg => pg.cita_id === c.id && pg.estado === 'pagado')
                    const esBloqueo = c.tipo === 'bloqueo'
                    const dCita = new Date(`${c.fecha_cita}T${c.hora_cita}`)
                    const isLate = dCita < horaActual && c.fecha_cita === hoyFechaFormat && !isCheckedIn && !isTerminado && !esBloqueo

                    let borde = 'border-l-blue-400'
                    if (c.tipo === 'seguimiento') borde = 'border-l-emerald-400'
                    if (c.tipo === 'solo_inbody') borde = 'border-l-orange-400'
                    if (c.tipo === 'enzimas') borde = 'border-l-purple-400'
                    if (esBloqueo) borde = 'border-l-slate-300'
                    if (isLate) borde = 'border-l-rose-500'

                    return (
                      <button
                        key={c.id}
                        onClick={() => setCitaSeleccionada(c)}
                        className={`w-full text-left bg-white p-4 rounded-2xl shadow-sm border border-slate-200 border-l-4 ${borde} flex items-center justify-between gap-3 ${isTerminado ? 'opacity-60' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{esBloqueo ? 'Bloqueado' : c.nombre_paciente}</p>
                          <p className="text-[11px] text-slate-500 font-bold mt-0.5">{c.hora_cita.substring(0, 5)} · {ETIQUETA_TIPO_CITA[c.tipo]} {isLate && '⚠️'}</p>
                        </div>
                        <div className="text-lg shrink-0">{isTerminado ? '✅' : isCheckedIn ? '🛋️' : ''}</div>
                      </button>
                    )
                  })}
                {citas.filter(c => c.fecha_cita === fechaSeleccionada && c.estado !== 'cancelada' && c.estado !== 'ausente').length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <p className="text-3xl mb-2">🌿</p>
                    <p className="text-xs font-bold uppercase tracking-widest">Sin citas este día</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => abrirAgendadorRapido(fechaSeleccionada, '09:00')}
              className="md:hidden fixed right-5 bottom-24 z-20 w-14 h-14 rounded-full bg-[#0066FF] text-white text-2xl font-black shadow-xl flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Agendar cita"
            >
              +
            </button>
            </>
          )}

          {/* VISTA 2: PACIENTES */}
          {activeTab === 'Pacientes' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 md:pb-8">
              <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 sm:px-8 sm:py-8 border-b border-slate-100 bg-slate-50 flex gap-4 items-center">
                    <span className="text-slate-400 text-xl">🔍</span>
                    <input type="text" placeholder="Buscar expediente por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent border-none text-lg font-black outline-none text-slate-800 placeholder:text-slate-300" />
                  </div>
                  <div className="divide-y divide-slate-100">
                    {pacientesFiltrados.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-6 sm:px-8 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center font-black text-sm border border-blue-100 shrink-0">{getInitials(p.nombre_completo)}</div>
                          <div>
                            <Link href={`/paciente/${p.id}`} className="text-base font-black text-slate-800 group-hover:text-[#0066FF] transition-colors">{p.nombre_completo}</Link>
                            <p className="text-xs text-slate-500 mt-1 font-medium">📞 {p.telefono} • {getTextoUltimaVisita(p.id, biDatos.ultimasVisitasDict)}</p>
                          </div>
                        </div>
                        <Link href={`/paciente/${p.id}`} className="text-slate-300 group-hover:text-[#0066FF] text-xl font-black">&rarr;</Link>
                      </div>
                    ))}
                    {pacientesFiltrados.length === 0 && <div className="p-12 text-center text-slate-400 text-sm font-bold">No se encontraron pacientes.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 3: ESTELA BI (FINANZAS) */}
          {activeTab === 'Finanzas' && esFullAccess && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 md:pb-8">
              <div className="max-w-6xl mx-auto space-y-6">

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-900 to-slate-900 text-white">
                  <div>
                    <h2 className="font-black text-2xl flex items-center gap-2">📊 Estela BI</h2>
                    <p className="text-sm text-blue-200 mt-1">Analítica y reportes de desempeño de tu clínica.</p>
                  </div>
                  <select value={filtroTiempo} onChange={(e) => setFiltroTiempo(e.target.value)} className="p-2.5 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer">
                    <option value="Mes Actual">Mes Actual</option><option value="Mes Anterior">Mes Anterior</option><option value="Últimos 3 Meses">Últimos 3 Meses</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { t: 'Ingresos Totales', v: `$${biDatos.kpis.ingresosTotales.toLocaleString('es-MX')}`, color: 'text-[#0066FF]' },
                    { t: 'Consultas Efectivas', v: biDatos.kpis.totalTrx, color: 'text-slate-800' },
                    { t: 'Servicios Clínicos', v: `$${biDatos.kpis.ingresosServicios.toLocaleString('es-MX')}`, color: 'text-emerald-600' },
                    { t: 'Ventas Farmacia', v: `$${biDatos.kpis.ingresosFarmacia.toLocaleString('es-MX')}`, color: 'text-purple-600' },
                    { t: 'Ausentismo (No-Show)', v: `${biDatos.kpis.porcentajeAusentismo}%`, color: 'text-rose-600', extra: `${biDatos.kpis.citasCanceladasMes} canceladas este mes` },
                  ].map((c, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
                      {c.t.includes('Ausentismo') && <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>}
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{c.t}</p>
                      <p className={`text-3xl font-black tracking-tight ${c.color}`}>{c.v}</p>
                      {c.extra && <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">{c.extra}</p>}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gastos Operativos</p>
                    <p className="text-2xl font-black text-rose-600">-${biDatos.kpis.totalGastos.toLocaleString('es-MX')}</p>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-3xl shadow-md md:col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilidad Neta del Periodo</p>
                    <p className="text-3xl font-black text-white">${biDatos.kpis.utilidadNeta.toLocaleString('es-MX')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-black text-slate-800 mb-1 flex items-center gap-2">🚨 Panel de Rescate CRM</h3>
                    <p className="text-xs text-slate-500 mb-6">Pacientes con riesgo de abandono de tratamiento (&gt;30 días).</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead><tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-widest"><th className="pb-3">Paciente</th><th className="pb-3">Ausencia</th><th className="pb-3 text-right">Recuperación</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {biDatos.alertasCRM.length === 0 ? (
                            <tr><td colSpan={3} className="py-10 text-center text-sm text-slate-400 font-bold">Sin riesgo de abandono. ¡Excelente retención!</td></tr>
                          ) : biDatos.alertasCRM.slice(0, 8).map((p: any, i: number) => {
                            const isGrave = p.dias_ausente > 60
                            const txtGrave = isGrave ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                            return (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 font-bold text-slate-700">{p.nombre_completo}</td>
                                <td className="py-4"><span className={`border px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider ${txtGrave}`}>{p.dias_ausente} días</span></td>
                                <td className="py-4 text-right">
                                  {p.telefono ? (
                                    <a href={`https://wa.me/${String(p.telefono).replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${p.nombre_completo}, habla Marla. Revisando mis expedientes noté que no te he visto en un tiempo. ¿Cómo vas con tus metas? ¡Me encantaría verte pronto!`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 bg-[#25D366]/10 text-[#128C7E] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#25D366] hover:text-white transition-all">📲 Escribir</a>
                                  ) : <span className="text-[10px] text-slate-300 font-bold uppercase">Sin Tel.</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-1"><h3 className="text-base font-black text-slate-800">Top Farmacia & Suplementos</h3><span className="text-xl">🏆</span></div>
                    <p className="text-xs text-slate-500 mb-6">Productos más desplazados en el periodo.</p>
                    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                      {biDatos.topFarmacia.length === 0 ? <p className="text-slate-400 font-bold text-sm text-center pt-10">No hay ventas registradas.</p> : null}
                      {biDatos.topFarmacia.map((p, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between items-end text-xs mb-2">
                            <span className="font-bold text-slate-700 truncate pr-4 text-sm">{p.nombre}</span>
                            <span className="font-black text-slate-900 text-sm">{p.cantidad} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">unid.</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-400 to-indigo-500 h-full rounded-full transition-all group-hover:from-[#0066FF] group-hover:to-cyan-400" style={{ width: `${(p.cantidad / biDatos.maxFarmacia) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h3 className="font-black text-slate-800">Registro de Gastos</h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-3 lg:col-span-1">
                      <input type="date" value={formGasto.fecha} onChange={e => setFormGasto({ ...formGasto, fecha: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#0066FF]" />
                      <select value={formGasto.categoria} onChange={e => setFormGasto({ ...formGasto, categoria: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#0066FF]">
                        <option>Fijos (Renta, Servicios)</option>
                        <option>Insumos Clínicos</option>
                        <option>Marketing y Publicidad</option>
                        <option>Nómina / Asistente</option>
                        <option>Impuestos / Contabilidad</option>
                        <option>Otros</option>
                      </select>
                      <input type="text" placeholder="Concepto (Ej. Pago de CFE)" value={formGasto.concepto} onChange={e => setFormGasto({ ...formGasto, concepto: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#0066FF]" />
                      <input type="number" placeholder="Monto ($)" value={formGasto.monto} onChange={e => setFormGasto({ ...formGasto, monto: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#0066FF]" />
                      <button onClick={registrarGasto} className="w-full bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-[#0066FF] transition-all shadow-md">Guardar Gasto</button>
                    </div>
                    <div className="lg:col-span-2 overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead><tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100"><th className="py-2">Fecha</th><th className="py-2">Concepto</th><th className="py-2 text-right">Monto</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {gastos.length === 0 ? (
                            <tr><td colSpan={3} className="py-8 text-center text-slate-400 font-bold text-sm">Sin gastos registrados.</td></tr>
                          ) : gastos.slice(0, 20).map(g => (
                            <tr key={g.id}>
                              <td className="py-3 text-xs font-bold text-slate-600">{new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-MX')}</td>
                              <td className="py-3 text-xs font-bold text-slate-800">{g.concepto}</td>
                              <td className="py-3 text-xs font-black text-rose-600 text-right">-${Number(g.monto).toLocaleString('es-MX')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 4: ALMACÉN */}
          {activeTab === 'Almacen' && esFullAccess && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 md:pb-8 flex items-center justify-center">
              <div className="max-w-md w-full text-center bg-white p-12 rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-20 h-20 bg-[#0066FF]/10 text-[#0066FF] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">📦</div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Almacén General</h2>
                <p className="text-slate-500 mb-8 text-sm">Control de stock e inventario de suplementos y enzimas.</p>
                <Link href="/inventario" className="bg-[#0066FF] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 inline-block shadow-md hover:shadow-lg hover:shadow-blue-500/30 transition-all">Abrir Inventario Completo &rarr;</Link>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* BARRA DE NAVEGACIÓN INFERIOR (MÓVIL) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex items-stretch px-2 pt-1.5" style={{ paddingBottom: 'env(safe-area-inset-bottom, 6px)' }}>
        <button onClick={() => setActiveTab('Mi Consultorio')} className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${activeTab === 'Mi Consultorio' ? 'text-[#0066FF]' : 'text-slate-400'}`}>
          <span className="text-xl">📅</span>
          <span className="text-[10px] font-bold">Agenda</span>
        </button>
        <button onClick={() => setActiveTab('Pacientes')} className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${activeTab === 'Pacientes' ? 'text-[#0066FF]' : 'text-slate-400'}`}>
          <span className="text-xl">👥</span>
          <span className="text-[10px] font-bold">Pacientes</span>
        </button>
        {esFullAccess && (
          <>
            <button onClick={() => setActiveTab('Finanzas')} className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${activeTab === 'Finanzas' ? 'text-[#0066FF]' : 'text-slate-400'}`}>
              <span className="text-xl">📊</span>
              <span className="text-[10px] font-bold">Finanzas</span>
            </button>
            <button onClick={() => setActiveTab('Almacen')} className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${activeTab === 'Almacen' ? 'text-[#0066FF]' : 'text-slate-400'}`}>
              <span className="text-xl">📦</span>
              <span className="text-[10px] font-bold">Almacén</span>
            </button>
          </>
        )}
        <button onClick={() => setShowMenuPerfil(true)} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-slate-400">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold">Tú</span>
        </button>
      </nav>
    </div>
  )
}
