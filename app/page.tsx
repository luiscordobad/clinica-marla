"use client"

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

// ⚠️ CORREOS AUTORIZADOS COMO ADMINISTRADORES (Marla y Tú)
const CORREOS_ADMIN = ['luiscordobad@gmail.com', 'marla@mail.com']

export default function Home() {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [citas, setCitas] = useState<any[]>([])
  const [transacciones, setTransacciones] = useState<any[]>([])
  const [inventario, setInventario] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  
  // RELOJ EN TIEMPO REAL (Para alertas de citas retrasadas)
  const [horaActual, setHoraActual] = useState(new Date())

  // Controles Generales de UI (Estructura Tipo NIMBO)
  const [activeTab, setActiveTab] = useState('Mi Consultorio')
  const [vistaAgenda, setVistaAgenda] = useState<'Dia' | 'Semana'>('Semana')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTiempo, setFiltroTiempo] = useState('Mes Actual')
  const [syncGCal, setSyncGCal] = useState(true)

  // Sistema de Notificaciones Estilo Apple (Toasts)
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'exito' | 'error' | 'advertencia' } | null>(null)

  // Estados Operativos / Caja
  const [cobroActivo, setCobroActivo] = useState<any>(null)
  const [formCobro, setFormCobro] = useState({ efectivo: '', tarjeta: '', transferencia: '', requiereFactura: false, recibo: 'whatsapp' })
  const [procesandoCobro, setProcesandoCobro] = useState(false)
  const [urlWhatsAppPendiente, setUrlWhatsAppPendiente] = useState<string | null>(null)

  // Modales de Agenda y Reagendamiento
  const [showModalAgendar, setShowModalAgendar] = useState(false)
  const [formCita, setFormCita] = useState({ id_paciente: '', fecha: '', hora: '', motivo: 'Consulta Subsecuente', repeticion: 1 })
  const [citaSeleccionada, setCitaSeleccionada] = useState<any>(null)
  
  // ESTADOS PARA MODIFICAR CITAS
  const [modoEdicionCita, setModoEdicionCita] = useState(false)
  const [formEdicion, setFormEdicion] = useState({ fecha: '', hora: '', motivo: '' })

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  // ============================================================================
  // EFECTOS INICIALES Y RELOJ EN TIEMPO REAL
  // ============================================================================
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
    const timer = setInterval(() => setHoraActual(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (citaSeleccionada) {
      setFormEdicion({ fecha: citaSeleccionada.fecha_cita, hora: citaSeleccionada.hora_cita, motivo: citaSeleccionada.motivo })
      setModoEdicionCita(false)
    }
  }, [citaSeleccionada])

  const enviarNotificacionEscritorio = (titulo: string, cuerpo: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, { body: cuerpo, icon: '/favicon.ico' })
    }
  }

  // ============================================================================
  // VARIABLES GLOBALES Y FECHAS
  // ============================================================================
  const hoyFechaFormat = new Date().toISOString().split('T')[0]
  const mananaObj = new Date(); mananaObj.setDate(mananaObj.getDate() + 1);
  const mananaFechaFormat = mananaObj.toISOString().split('T')[0]

  const totalPagadoModal = Number(formCobro.efectivo) + Number(formCobro.tarjeta) + Number(formCobro.transferencia)
  const totalEsperadoModal = cobroActivo ? Number(cobroActivo.monto_cobrado || cobroActivo.Monto_Cobrado || 0) : 0
  const balanceModal = totalPagadoModal - totalEsperadoModal

  const HORAS_SMART = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']
  const DIAS_NOMBRES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // ============================================================================
  // FUNCIONES AUXILIARES DE UI Y FECHAS
  // ============================================================================
  const mostrarToast = (mensaje: string, tipo: 'exito' | 'error' | 'advertencia') => { setToast({ mensaje, tipo }); setTimeout(() => setToast(null), 4000) }

  const extraerFechaLocal = (val: any) => {
    if (!val) return null;
    const str = String(val).trim();
    const matchISO = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (matchISO) return new Date(Number(matchISO[1]), Number(matchISO[2]) - 1, Number(matchISO[3]), 12);
    const matchLatino = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchLatino) return new Date(Number(matchLatino[3]), Number(matchLatino[2]) - 1, Number(matchLatino[1]), 12);
    return null;
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
  
  // Formateador de Teléfono
  const getTelefonoPaciente = (id: string) => {
    const p = pacientes.find(x => (x.id_paciente || x.ID_Paciente) === id)
    return p ? String(p.telefono || p.Telefono).replace(/\D/g, '') : ''
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

  const copiarEnlacePortal = (id: string) => { navigator.clipboard.writeText(`https://clinica-marla.app/portal/${id}`); mostrarToast("Enlace del Portal copiado", "exito") }
  const getOriginalCitasCount = (dateStr: string) => citas.filter(c => c.fecha_cita === dateStr && c.estado !== 'Cancelada' && c.estado !== 'Ausente').length

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/login'
      else { setUsuario(session.user.email || ''); setEsAdmin(CORREOS_ADMIN.includes(session.user.email || '')); cargarDatos() }
    }
    verificarSesion()
  }, [])

  const cargarDatos = async () => {
    const [ { data: pData }, { data: cData }, { data: tData }, { data: iData } ] = await Promise.all([
      supabase.from('pacientes').select('*').order('fecha_registro', { ascending: false }),
      supabase.from('citas').select('*').order('hora_cita', { ascending: true }),
      supabase.from('transacciones').select('*').order('fecha', { ascending: false }),
      supabase.from('inventario').select('*')
    ])
    if (pData) setPacientes(pData); if (cData) setCitas(cData); if (tData) setTransacciones(tData); if (iData) setInventario(iData)
    setLoading(false)
  }

  const cerrarSesion = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  // ============================================================================
  // COLAS DE TRABAJO (SALA DE ESPERA Y CAJA)
  // ============================================================================
  const pacientesEnCaja = useMemo(() => transacciones.filter(t => (t.metodo_pago || t.Metodo_Pago) === 'Pendiente en Caja' && String(t.fecha || t.Fecha).includes(hoyFechaFormat)), [transacciones, hoyFechaFormat])
  const pacientesEnEspera = useMemo(() => transacciones.filter(t => (t.metodo_pago || t.Metodo_Pago) === 'En Sala de Espera' && String(t.fecha || t.Fecha).includes(hoyFechaFormat)), [transacciones, hoyFechaFormat])

  // ============================================================================
  // AGENDA INTELIGENTE Y ACCIONES (Reagendar, No-Show)
  // ============================================================================
  const getDuracionMinutos = (motivo: string) => {
    if (motivo === 'Primera Vez' || motivo === 'Bloqueo de Agenda') return 60
    if (motivo === 'Solo InBody') return 15
    if (motivo === 'Aplicación de Enzimas') return 45
    return 30
  }

  const timeToMins = (timeStr: string) => { const [h, m] = timeStr.split(':').map(Number); return h * 60 + m }

  const hayColisionCita = useMemo(() => {
    if (!formCita.fecha || !formCita.hora) return false
    const nInicio = timeToMins(formCita.hora); const nFin = nInicio + getDuracionMinutos(formCita.motivo)
    return citas.some(c => {
      if (c.fecha_cita !== formCita.fecha || c.estado === 'Cancelada' || c.estado === 'Ausente') return false
      const eInicio = timeToMins(c.hora_cita.substring(0, 5)); const eFin = eInicio + getDuracionMinutos(c.motivo)
      return (nInicio < eFin && nFin > eInicio)
    })
  }, [formCita.fecha, formCita.hora, formCita.motivo, citas])

  const abrirAgendadorRapido = (fecha: string, hora: string) => { setFormCita({ id_paciente: '', fecha, hora, motivo: 'Consulta Subsecuente', repeticion: 1 }); setShowModalAgendar(true) }

  const agendarNuevaCita = async () => {
    if (hayColisionCita) return mostrarToast("Existe un conflicto de horario.", "error")
    const esBloqueo = formCita.motivo === 'Bloqueo de Agenda'
    if (!esBloqueo && !formCita.id_paciente) return mostrarToast("Selecciona un paciente.", "advertencia")
    if (!formCita.fecha || !formCita.hora) return mostrarToast("Completa la fecha y hora.", "advertencia")

    let nombrePaciente = 'Bloqueo Personal'; let idPaciente = null
    if (!esBloqueo) { const pSelec = pacientes.find(p => (p.id_paciente || p.ID_Paciente) === formCita.id_paciente); if(pSelec) { nombrePaciente = pSelec.nombre_completo || pSelec.Nombre_Completo; idPaciente = pSelec.id_paciente || pSelec.ID_Paciente } }

    const citasParaInsertar = []
    const fechaBase = new Date(formCita.fecha + 'T12:00:00')
    for (let i = 0; i < formCita.repeticion; i++) {
      const d = new Date(fechaBase.getTime()); d.setDate(d.getDate() + (i * 7)) 
      citasParaInsertar.push({ id_paciente: idPaciente, nombre_paciente: nombrePaciente, fecha_cita: d.toISOString().split('T')[0], hora_cita: formCita.hora, motivo: formCita.motivo, estado: 'Programada' })
    }

    const { error } = await supabase.from('citas').insert(citasParaInsertar)
    if (!error) { await cargarDatos(); setShowModalAgendar(false); setFormCita({ id_paciente: '', fecha: '', hora: '', motivo: 'Consulta Subsecuente', repeticion: 1 }); mostrarToast(esBloqueo ? "Agenda bloqueada" : "Cita agendada", "exito") } else mostrarToast("Error: " + error.message, "error")
  }

  const guardarEdicionCita = async () => {
    const idCol = citaSeleccionada.id_cita !== undefined ? 'id_cita' : 'id'
    const nInicio = timeToMins(formEdicion.hora); const nFin = nInicio + getDuracionMinutos(formEdicion.motivo)
    const colision = citas.some(c => {
      if (c[idCol] === citaSeleccionada[idCol]) return false 
      if (c.fecha_cita !== formEdicion.fecha || c.estado === 'Cancelada' || c.estado === 'Ausente') return false
      const eInicio = timeToMins(c.hora_cita.substring(0, 5)); const eFin = eInicio + getDuracionMinutos(c.motivo)
      return (nInicio < eFin && nFin > eInicio)
    })

    if (colision) return mostrarToast("Ese horario ya está ocupado.", "error")

    const { error } = await supabase.from('citas').update({ fecha_cita: formEdicion.fecha, hora_cita: formEdicion.hora, motivo: formEdicion.motivo }).eq(idCol, citaSeleccionada[idCol])
    if (!error) { await cargarDatos(); setModoEdicionCita(false); setCitaSeleccionada(null); mostrarToast("Cita actualizada exitosamente", "exito") } else mostrarToast("Error de red", "error")
  }

  const cancelarCita = async (idCita: string) => {
    if (!window.confirm('¿Confirmas que deseas CANCELAR esta cita?')) return
    const idCitaQuery = idCita !== undefined ? 'id_cita' : 'id'
    const { error } = await supabase.from('citas').update({ estado: 'Cancelada' }).eq(idCitaQuery, idCita)
    if (!error) { await cargarDatos(); setCitaSeleccionada(null); mostrarToast("Cita cancelada", "exito") }
  }

  const marcarAusente = async (idCita: string) => {
    if (!window.confirm('¿Marcar a este paciente como Ausente (No-Show)?')) return
    const idCitaQuery = idCita !== undefined ? 'id_cita' : 'id'
    const { error } = await supabase.from('citas').update({ estado: 'Ausente' }).eq(idCitaQuery, idCita)
    if (!error) { await cargarDatos(); setCitaSeleccionada(null); mostrarToast("Marcado como Ausente", "advertencia") }
  }

  const hacerCheckInRapido = async (pId: string, pNombre: string, idCita: string) => {
    const idCitaQuery = idCita !== undefined ? 'id_cita' : 'id'
    await supabase.from('citas').update({ estado: 'En Espera' }).eq(idCitaQuery, idCita)
    const { error } = await supabase.from('transacciones').insert([{ id_transaccion: `TRX-${Math.floor(Date.now() / 1000)}`, id_paciente: pId, cliente: pNombre, fecha: `${hoyFechaFormat} 12:00:00`, metodo_pago: 'En Sala de Espera', es_consulta: 'Check-In', concepto_historico: 'Esperando Consulta' }])
    if (!error) { await cargarDatos(); setCitaSeleccionada(null); mostrarToast(`${pNombre} en Sala de Espera`, "exito"); enviarNotificacionEscritorio("Check-In", `${pNombre} ya llegó.`) }
  }

  // ============================================================================
  // ESTELA BI: INTELIGENCIA DE NEGOCIO Y CRM
  // ============================================================================
  const biDatos = useMemo(() => {
    const hoy = new Date()
    const citasDelMesActual = citas.filter(c => { const fT = extraerFechaLocal(c.fecha_cita); return fT && fT.getMonth() === hoy.getMonth() && fT.getFullYear() === hoy.getFullYear() })
    const citasCanceladasMes = citasDelMesActual.filter(c => c.estado === 'Cancelada' || c.estado === 'Ausente').length
    const porcentajeAusentismo = citasDelMesActual.length > 0 ? ((citasCanceladasMes / citasDelMesActual.length) * 100).toFixed(1) : '0.0'

    const trxFiltradas = transacciones.filter(t => {
      const m = t.metodo_pago || t.Metodo_Pago || ''; if (m === 'En Sala de Espera' || m === 'Pendiente en Caja') return false
      const fT = extraerFechaLocal(t.fecha || t.Fecha); if (!fT) return false
      if (filtroTiempo === 'Mes Actual') return fT.getMonth() === hoy.getMonth() && fT.getFullYear() === hoy.getFullYear()
      if (filtroTiempo === 'Mes Anterior') { const mAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1); return fT.getMonth() === mAnt.getMonth() && fT.getFullYear() === mAnt.getFullYear() }
      if (filtroTiempo === 'Últimos 3 Meses') return fT >= new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate())
      if (filtroTiempo === 'Este Año') return fT.getFullYear() === hoy.getFullYear()
      return true
    })

    let ingresosTotales = 0, ingresosFarmacia = 0
    const conteoProductos = new Map(), tendenciaDiariaMap = new Map()
    const mapaInv = new Map(inventario.map(i => [i.id_prod || i.ID_PROD, i]))

    trxFiltradas.forEach(t => {
      ingresosTotales += Number(t.monto_cobrado || t.Monto_Cobrado || 0)
      const fT = extraerFechaLocal(t.fecha || t.Fecha)
      if (fT) { const dC = `${fT.getDate()}/${fT.getMonth() + 1}`; tendenciaDiariaMap.set(dC, (tendenciaDiariaMap.get(dC) || 0) + Number(t.monto_cobrado || t.Monto_Cobrado || 0)) }
      const prods = [t.producto_1, t.producto_2, t.producto_3, t.producto_4, t.producto_5, t.producto_6].filter(Boolean)
      prods.forEach(pId => {
        const prod = mapaInv.get(pId); if (prod) { ingresosFarmacia += Number(prod.precio_venta || prod.PRECIO_VENTA || 0); conteoProductos.set(prod.producto || prod.PRODUCTO, (conteoProductos.get(prod.producto || prod.PRODUCTO) || 0) + 1) }
      })
    })

    const ingresosServicios = Math.max(0, ingresosTotales - ingresosFarmacia)
    const tendencia = Array.from(tendenciaDiariaMap, ([dia, total]) => ({ dia, total })).reverse()
    const topFarmacia = Array.from(conteoProductos, ([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)

    const ultimasVisitasDict: Record<string, Date> = {}
    transacciones.forEach(t => {
      const m = t.metodo_pago || t.Metodo_Pago || ''; if (m === 'En Sala de Espera' || m === 'Pendiente en Caja') return
      const f = extraerFechaLocal(t.fecha || t.Fecha); if (t.id_paciente && f && (!ultimasVisitasDict[t.id_paciente] || f > ultimasVisitasDict[t.id_paciente])) ultimasVisitasDict[t.id_paciente] = f
    })

    const alertasCRM = pacientes.map(p => {
      const pId = p.id_paciente || p.ID_Paciente; const u = ultimasVisitasDict[pId]; if (!u) return null
      const dias = Math.floor((hoy.getTime() - u.getTime()) / (1000 * 3600 * 24))
      return dias > 30 ? { ...p, dias_ausente: dias, ultima_cita: u } : null
    }).filter(Boolean).sort((a: any, b: any) => b.dias_ausente - a.dias_ausente)

    const hoyMes = String(hoy.getMonth() + 1).padStart(2, '0'); const hoyDia = String(hoy.getDate()).padStart(2, '0')
    const cumpleaneros = pacientes.filter(p => { const fn = String(p.fecha_nacimiento || p.Fecha_Nacimiento); return fn.includes(`-${hoyMes}-${hoyDia}`) || fn.includes(`${hoyDia}/${hoyMes}`) })

    return {
      kpis: { ingresosTotales, ingresosServicios, ingresosFarmacia, totalTrx: trxFiltradas.length, porcentajeAusentismo, citasCanceladasMes },
      tendencia, maxTendencia: tendencia.length ? Math.max(...tendencia.map(d => d.total)) : 1,
      topFarmacia, maxFarmacia: topFarmacia.length ? Math.max(...topFarmacia.map(p => p.cantidad)) : 1,
      alertasCRM, ultimasVisitasDict, cumpleaneros
    }
  }, [transacciones, pacientes, inventario, citas, filtroTiempo])

  // ============================================================================
  // PROCESAMIENTO DE COBRO
  // ============================================================================
  const finalizarCobroEnRecepcion = async () => {
    setProcesandoCobro(true)
    if (totalPagadoModal < totalEsperadoModal) { mostrarToast("Monto incompleto", "advertencia"); setProcesandoCobro(false); return }
    let metodosArray = []
    if(Number(formCobro.efectivo) > 0) metodosArray.push(`Efectivo`)
    if(Number(formCobro.tarjeta) > 0) metodosArray.push(`Tarjeta`)
    if(Number(formCobro.transferencia) > 0) metodosArray.push(`Transf.`)
    let stringFinal = metodosArray.join(' + ') + (formCobro.requiereFactura ? ' | 🧾 FACTURA CFDI' : '')
    
    const idCol = cobroActivo.id_transaccion !== undefined ? 'id_transaccion' : 'ID_Transaccion'
    const metodoPagoKey = cobroActivo.metodo_pago !== undefined ? 'metodo_pago' : 'Metodo_Pago'
    
    const { error } = await supabase.from('transacciones').update({ [metodoPagoKey]: stringFinal }).eq(idCol, cobroActivo[idCol])

    if (!error) {
      const prodsId = [cobroActivo.producto_1, cobroActivo.producto_2, cobroActivo.producto_3, cobroActivo.producto_4, cobroActivo.producto_5, cobroActivo.producto_6].filter(Boolean)
      const nombresProdsVenta = []
      for (const pId of prodsId) {
        const prod = inventario.find(i => i.id_prod === pId || i.ID_PROD === pId)
        if (prod) {
          nombresProdsVenta.push(prod.producto || prod.PRODUCTO)
          const stockKey = prod.stock !== undefined ? 'stock' : 'STOCK'
          await supabase.from('inventario').update({ [stockKey]: Number(prod[stockKey]) - 1 }).eq(prod.id_prod !== undefined ? 'id_prod' : 'ID_PROD', pId)
        }
      }

      if (formCobro.recibo === 'pdf') {
         mostrarToast("Generando Ticket PDF...", "exito")
         setTimeout(() => window.print(), 1000)
      } else if (formCobro.recibo === 'whatsapp') {
        const pacienteInfo = pacientes.find(p => p.id_paciente === cobroActivo.id_paciente || p.ID_Paciente === cobroActivo.ID_Paciente)
        if (pacienteInfo?.telefono || pacienteInfo?.Telefono) {
          let texto = `*Clínica Marla - Ticket de Servicio* 🌿\n\nHola *${pacienteInfo.nombre_completo || pacienteInfo.Nombre_Completo}*, tu pago se procesó exitosamente.\n\n🩺 *Servicio:* ${cobroActivo.concepto_historico || cobroActivo.es_consulta}\n`
          if (nombresProdsVenta.length > 0) { texto += `\n*Suplementos:*\n`; nombresProdsVenta.forEach(n => texto += `💊 ${n}\n`) }
          texto += `\n*Total Abonado:* $${totalEsperadoModal.toLocaleString()}\n💳 *Pago:* ${metodosArray.join(', ')}\n`
          if (formCobro.requiereFactura) texto += `\n📌 _Tu factura CFDI será enviada a tu correo registrado en breve._\n`
          texto += `\n¡Gracias por tu visita! ✨`
          setUrlWhatsAppPendiente(`https://wa.me/${String(pacienteInfo.telefono || pacienteInfo.Telefono).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`)
        }
      }
      await cargarDatos(); setCobroActivo(null); setFormCobro({ efectivo: '', tarjeta: '', transferencia: '', requiereFactura: false, recibo: 'whatsapp' })
      if (formCobro.recibo !== 'pdf') mostrarToast("Cobro procesado con éxito", "exito")
    } else mostrarToast("Error de red: " + error.message, "error")
    setProcesandoCobro(false)
  }

  const pacientesFiltrados = pacientes.filter(p => (p.nombre_completo || p.Nombre_Completo || '').toLowerCase().includes(searchTerm.toLowerCase()))
  const diasSemanales = obtenerDiasSemana(fechaSeleccionada)
  const citasManana = citas.filter(c => c.fecha_cita === mananaFechaFormat && c.estado !== 'Cancelada' && c.estado !== 'Ausente' && c.motivo !== 'Bloqueo de Agenda')

  // Obtener Datos del Paciente de la Cita Seleccionada (Para el Modal)
  const pacienteCitaSeleccionada = citaSeleccionada && citaSeleccionada.motivo !== 'Bloqueo de Agenda' ? pacientes.find(p => (p.id_paciente || p.ID_Paciente) === citaSeleccionada.id_paciente) : null
  const telefonoLimpioCita = pacienteCitaSeleccionada?.telefono || pacienteCitaSeleccionada?.Telefono ? String(pacienteCitaSeleccionada.telefono || pacienteCitaSeleccionada.Telefono).replace(/\D/g, '') : null

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><p className="animate-pulse font-bold text-[#0066FF]">Cargando plataforma...</p></div>

  return (
    <div className="flex h-screen bg-[#F4F6F9] font-sans text-slate-800 overflow-hidden">
      
      {/* 🔔 TOASTS Y MODALES GLOBALES */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className={`px-6 py-3.5 rounded-full shadow-xl font-bold text-sm text-white flex items-center gap-2 ${toast.tipo === 'exito' ? 'bg-[#00D084]' : toast.tipo === 'error' ? 'bg-rose-500' : 'bg-amber-500 text-slate-900'}`}>
            <span>{toast.tipo === 'exito' ? '✅' : toast.tipo === 'error' ? '🛑' : '⚠️'}</span> {toast.mensaje}
          </div>
        </div>
      )}
      
      {/* 🟢 MODAL VIVO: DETALLES DE CITA Y ACCIONES RÁPIDAS (ESTILO NIMBO) */}
      {citaSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCitaSeleccionada(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-slate-200" onClick={e => e.stopPropagation()}>
            
            {/* Header Modal - Color dinámico si está retrasado */}
            <div className={`p-6 text-white ${citaSeleccionada.motivo === 'Bloqueo de Agenda' ? 'bg-slate-600' : 
              (new Date(`${citaSeleccionada.fecha_cita}T${citaSeleccionada.hora_cita}`) < horaActual && citaSeleccionada.estado === 'Programada' && citaSeleccionada.fecha_cita === hoyFechaFormat) ? 'bg-rose-500' : 'bg-[#0066FF]'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="bg-white/20 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {citaSeleccionada.estado === 'Programada' && new Date(`${citaSeleccionada.fecha_cita}T${citaSeleccionada.hora_cita}`) < horaActual && citaSeleccionada.fecha_cita === hoyFechaFormat ? '⚠️ Retraso Detectado' : citaSeleccionada.estado || 'Programada'}
                </span>
                <button onClick={() => setCitaSeleccionada(null)} className="text-white/70 hover:text-white font-bold text-xl leading-none transition-colors">&times;</button>
              </div>
              <h3 className="text-2xl font-black mb-1 leading-tight">{citaSeleccionada.nombre_paciente}</h3>
              <p className="text-sm font-medium opacity-90">{citaSeleccionada.motivo}</p>
            </div>
            
            <div className="p-6">
              {modoEdicionCita ? (
                /* MODO EDICIÓN DE CITA */
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Motivo de Cita</label>
                    <select value={formEdicion.motivo} onChange={e => setFormEdicion({...formEdicion, motivo: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF]">
                      <option value="Consulta Subsecuente">Consulta Subsecuente</option>
                      <option value="Primera Vez">Primera Vez</option>
                      <option value="Solo InBody">Solo InBody</option>
                      <option value="Aplicación de Enzimas">Aplicación de Enzimas</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Fecha</label>
                      <input type="date" value={formEdicion.fecha} onChange={e => setFormEdicion({...formEdicion, fecha: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF]"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hora</label>
                      <input type="time" value={formEdicion.hora} onChange={e => setFormEdicion({...formEdicion, hora: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF]"/>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setModoEdicionCita(false)} className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200">Cancelar</button>
                    <button onClick={guardarEdicionCita} className="flex-1 bg-[#0066FF] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700">💾 Guardar Cambios</button>
                  </div>
                </div>
              ) : (
                /* MODO VISUALIZACIÓN / ACCIONES */
                <div className="space-y-5">
                  <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl">📅</div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</p>
                      <p className="text-sm font-black text-slate-800">
                        {new Date(citaSeleccionada.fecha_cita + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long'})} 
                        <br/>
                        <span className="text-[#0066FF]">
                          {citaSeleccionada.hora_cita.substring(0,5)} - {
                            (() => {
                              const minFinal = timeToMins(citaSeleccionada.hora_cita.substring(0,5)) + getDuracionMinutos(citaSeleccionada.motivo)
                              return `${String(Math.floor(minFinal / 60)).padStart(2, '0')}:${String(minFinal % 60).padStart(2, '0')}`
                            })()
                          } hrs
                        </span> 
                        <span className="text-slate-400 font-medium text-[10px]"> ({getDuracionMinutos(citaSeleccionada.motivo)} min)</span>
                      </p>
                    </div>
                  </div>

                  {pacienteCitaSeleccionada && (
                    <div className="flex items-center justify-between gap-4 text-slate-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">📱</div>
                         <div>
                           <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Contacto</p>
                           <p className="text-sm font-black text-emerald-900">{formatPhoneNumber(pacienteCitaSeleccionada.telefono || pacienteCitaSeleccionada.Telefono || '')}</p>
                         </div>
                      </div>
                      {telefonoLimpioCita && (
                        <a href={`https://wa.me/${telefonoLimpioCita}?text=${encodeURIComponent(`Hola ${citaSeleccionada.nombre_paciente}, te escribimos de Clínica Marla para verificar si vienes en camino a tu cita de las ${citaSeleccionada.hora_cita.substring(0,5)}. ¡Te esperamos! 🌿`)}`} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-sm hover:bg-[#128C7E] transition-colors flex items-center gap-1">
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {citaSeleccionada.motivo === 'Bloqueo de Agenda' ? (
                      <button onClick={() => cancelarCita(citaSeleccionada.id_cita || citaSeleccionada.id)} className="col-span-2 py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-colors border border-rose-100">
                        🗑️ Liberar Bloqueo
                      </button>
                    ) : (
                      <>
                        {/* Botón Principal Inteligente */}
                        {citaSeleccionada.estado === 'Programada' && !esAdmin && (
                          <button onClick={() => hacerCheckInRapido(citaSeleccionada.id_paciente, citaSeleccionada.nombre_paciente, citaSeleccionada.id_cita || citaSeleccionada.id)} className="col-span-2 py-3.5 bg-[#00D084] text-white rounded-xl text-sm font-black hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2 mb-2">
                            📍 Registrar Llegada (Check-In)
                          </button>
                        )}
                        {citaSeleccionada.estado === 'En Espera' && esAdmin && (
                          <Link href={`/paciente/${citaSeleccionada.id_paciente}`} className="col-span-2 py-3.5 flex items-center justify-center gap-2 bg-[#0066FF] text-white rounded-xl text-sm font-black shadow-md hover:bg-blue-700 transition-colors mb-2">
                            🩺 Iniciar Consulta Médica
                          </Link>
                        )}
                        
                        {/* Botones Secundarios */}
                        <Link href={`/paciente/${citaSeleccionada.id_paciente}`} className="py-2.5 flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold border border-slate-200 hover:bg-slate-100 transition-colors">
                          👤 Expediente
                        </Link>
                        <button onClick={() => setModoEdicionCita(true)} className="py-2.5 flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold border border-slate-200 hover:bg-slate-100 transition-colors">
                          ✏️ Modificar
                        </button>
                        
                        <button onClick={() => marcarAusente(citaSeleccionada.id_cita || citaSeleccionada.id)} className="py-2.5 flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold border border-amber-200 hover:bg-amber-100 transition-colors">
                          👻 No Show
                        </button>
                        <button onClick={() => cancelarCita(citaSeleccionada.id_cita || citaSeleccionada.id)} className="py-2.5 flex items-center justify-center gap-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold border border-rose-200 hover:bg-rose-100 transition-colors">
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
            <h3 className="text-xl font-black mb-1">Check-Out: {cobroActivo.cliente}</h3>
            <p className="text-sm text-slate-500 mb-6">{cobroActivo.concepto_historico || cobroActivo.es_consulta}</p>
            
            <div className="bg-blue-50 text-[#0066FF] rounded-xl p-6 text-center mb-6 border border-blue-100">
              <p className="text-xs font-black uppercase tracking-widest mb-1">Total a Cobrar</p>
              <p className="text-4xl font-black">${totalEsperadoModal.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[ { id: 'efectivo', label: 'Efectivo', val: formCobro.efectivo }, { id: 'tarjeta', label: 'Tarjeta', val: formCobro.tarjeta }, { id: 'transferencia', label: 'Transf.', val: formCobro.transferencia } ].map(m => (
                <div key={m.id} className="border border-slate-200 p-3 rounded-xl focus-within:border-[#0066FF] transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-2">{m.label}</p>
                  <input type="number" value={m.val} onChange={e => setFormCobro({...formCobro, [m.id]: e.target.value})} className="w-full text-center text-sm font-bold outline-none" placeholder="$0" />
                </div>
              ))}
            </div>

            {/* Opciones de Ticket y Facturación */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <p className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-widest">Emisión de Comprobante</p>
              <div className="flex gap-2 mb-4">
                 <button className={`flex-1 p-2 rounded-lg text-[10px] font-bold border transition-colors ${formCobro.recibo === 'whatsapp' ? 'bg-[#25D366] text-white border-[#25D366] shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`} onClick={() => setFormCobro({...formCobro, recibo: 'whatsapp'})}>📱 WhatsApp</button>
                 <button className={`flex-1 p-2 rounded-lg text-[10px] font-bold border transition-colors ${formCobro.recibo === 'pdf' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`} onClick={() => setFormCobro({...formCobro, recibo: 'pdf'})}>📄 Imprimir (PDF)</button>
                 <button className={`flex-1 p-2 rounded-lg text-[10px] font-bold border transition-colors ${formCobro.recibo === 'ninguno' ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-white text-slate-500 hover:bg-slate-100'}`} onClick={() => setFormCobro({...formCobro, recibo: 'ninguno'})}>❌ Ninguno</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-[#0066FF] transition-colors" onClick={() => setFormCobro({...formCobro, requiereFactura: !formCobro.requiereFactura})}>
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
                <select value={formCita.motivo} onChange={e => setFormCita({...formCita, motivo: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer">
                  <option value="Consulta Subsecuente">Consulta Subsecuente (30 min)</option>
                  <option value="Primera Vez">Primera Vez (1 hora)</option>
                  <option value="Solo InBody">Solo InBody (15 min)</option>
                  <option value="Aplicación de Enzimas">Aplicación de Enzimas (45 min)</option>
                  <option value="Bloqueo de Agenda">🛑 Bloqueo de Horario (Personal)</option>
                </select>
              </div>

              {formCita.motivo !== 'Bloqueo de Agenda' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Paciente</label>
                  <select value={formCita.id_paciente} onChange={e => setFormCita({...formCita, id_paciente: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer">
                    <option value="">Selecciona paciente...</option>
                    {pacientes.map(p => <option key={p.id_paciente || p.ID_Paciente} value={p.id_paciente || p.ID_Paciente}>{p.nombre_completo || p.Nombre_Completo}</option>)}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Fecha</label>
                  <input type="date" value={formCita.fecha} onChange={e => setFormCita({...formCita, fecha: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Hora Inicio</label>
                  <input type="time" value={formCita.hora} onChange={e => setFormCita({...formCita, hora: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer"/>
                </div>
              </div>

              {formCita.motivo !== 'Bloqueo de Agenda' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Repetición Semanal</label>
                  <select value={formCita.repeticion} onChange={e => setFormCita({...formCita, repeticion: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0066FF] transition-colors cursor-pointer">
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

      {/* ======================================================================
          SIDEBAR IZQUIERDO (NIMBO STYLE)
      ====================================================================== */}
      <aside className="w-[72px] bg-white border-r border-slate-200 flex flex-col items-center py-6 shrink-0 z-20">
        <div className="w-10 h-10 bg-[#0066FF] rounded-lg flex items-center justify-center text-white font-black text-xl mb-8 shadow-sm">M</div>
        
        <nav className="flex-1 flex flex-col gap-4 w-full px-3">
          <button onClick={() => setActiveTab('Mi Consultorio')} title="Agenda Clínica" className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${activeTab === 'Mi Consultorio' ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>📅</button>
          <button onClick={() => setActiveTab('Pacientes')} title="Directorio" className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${activeTab === 'Pacientes' ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>👥</button>
          {esAdmin && (
            <>
              <button onClick={() => setActiveTab('Finanzas')} title="Estela BI (Reportes)" className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${activeTab === 'Finanzas' ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>📊</button>
              <button onClick={() => setActiveTab('Almacen')} title="Farmacia" className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${activeTab === 'Almacen' ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>📦</button>
            </>
          )}
        </nav>

        <button onClick={cerrarSesion} title="Cerrar Sesión" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors mt-auto font-bold text-sm">
          {getInitials(usuario || 'U')}
        </button>
      </aside>

      {/* ======================================================================
          ÁREA PRINCIPAL
      ====================================================================== */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        
        {/* HEADER SUPERIOR */}
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-slate-800 font-black text-lg">Clínica Marla</span>
            <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">{esAdmin ? 'Nutrición Clínica' : 'Recepción Médica'}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/registro" className="text-[#0066FF] font-bold text-sm hover:underline flex items-center gap-1"><span>+</span> Nuevo Paciente</Link>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-[#0066FF]">{getInitials(usuario || '')}</div>
              <span className="text-sm font-bold text-slate-700 hidden sm:inline pr-2">{usuario?.split('@')[0]}</span>
            </div>
          </div>
        </header>

        {/* CONTENEDOR DE VISTAS */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* ==================== VISTA 1: AGENDA Y WORKLIST (70% - 30%) ==================== */}
          {activeTab === 'Mi Consultorio' && (
            <div className="flex-1 flex w-full h-full overflow-hidden">
              
              {/* COLUMNA IZQUIERDA: CALENDARIO (70%) */}
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
                    <button onClick={() => {setSyncGCal(!syncGCal); mostrarToast(syncGCal ? "Google Calendar Desactivado" : "Sincronización con Google Activada", "exito")}} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${syncGCal ? 'bg-[#4285F4]/10 text-[#4285F4] border-[#4285F4]/20' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                       {syncGCal ? '🔄 Sincronizado GCal' : '🔌 Conectar GCal'}
                    </button>
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
                    
                    {/* Headers Días */}
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

                    {/* Grid Filas (Agenda Inteligente Live) */}
                    <div className="flex-1 relative pb-10">
                      {HORAS_SMART.map((hora) => (
                        <div key={hora} className={`grid ${vistaAgenda === 'Semana' ? 'grid-cols-[80px_repeat(7,1fr)]' : 'grid-cols-[80px_1fr]'} border-b border-slate-100 h-24 bg-white/50`}>
                          <div className="text-[10px] text-slate-400 font-bold text-center py-2 border-r border-slate-100 bg-white">{hora}</div>
                          
                          {(vistaAgenda === 'Semana' ? diasSemanales.map(d => d.iso) : [fechaSeleccionada]).map((isoDate, colIdx) => {
                            const citasEnCelda = citas.filter(c => c.fecha_cita === isoDate && c.hora_cita.startsWith(hora.substring(0,2)) && c.estado !== 'Cancelada' && c.estado !== 'Ausente')
                            
                            return (
                              <div 
                                key={colIdx} 
                                className={`border-r border-slate-100 relative p-1 transition-colors cursor-pointer group hover:bg-slate-50 ${isoDate === hoyFechaFormat ? 'bg-blue-50/10' : 'bg-transparent'}`}
                                onClick={() => { if(citasEnCelda.length === 0) abrirAgendadorRapido(isoDate, hora) }}
                              >
                                {citasEnCelda.map(c => {
                                  const isCheckedIn = pacientesEnEspera.some(p => p.id_paciente === c.id_paciente) || c.estado === 'En Espera'
                                  const isEnCaja = pacientesEnCaja.some(p => p.id_paciente === c.id_paciente)
                                  const isTerminado = transacciones.some(t => String(t.fecha || t.Fecha).includes(hoyFechaFormat) && t.id_paciente === c.id_paciente && t.metodo_pago !== 'En Sala de Espera' && t.metodo_pago !== 'Pendiente en Caja')
                                  const esBloqueo = c.motivo === 'Bloqueo de Agenda'
                                  
                                  const minsDur = getDuracionMinutos(c.motivo)
                                  const numBlocks = minsDur / 60
                                  
                                  // 🟢 LÓGICA DE TIEMPO REAL: ¿Está retrasado?
                                  const dCita = new Date(`${c.fecha_cita}T${c.hora_cita}`)
                                  const isLate = dCita < horaActual && c.fecha_cita === hoyFechaFormat && !isCheckedIn && !isTerminado && !isEnCaja && !esBloqueo

                                  // Paleta de Colores Clara
                                  let bgClass = "bg-blue-50 border-blue-400 text-blue-900" 
                                  if (c.motivo.includes('Subsecuente')) bgClass = "bg-emerald-50 border-emerald-400 text-emerald-900"
                                  if (c.motivo.includes('InBody')) bgClass = "bg-orange-50 border-orange-400 text-orange-900"
                                  if (c.motivo.includes('Enzimas')) bgClass = "bg-purple-50 border-purple-400 text-purple-900"
                                  if (isTerminado) bgClass = "bg-slate-100 border-slate-300 text-slate-500 opacity-60"
                                  
                                  // Override Visual de Retraso
                                  if (isLate) bgClass = "bg-rose-50 border-rose-500 text-rose-900 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse"
                                  
                                  if (esBloqueo) {
                                    return (
                                      <div key={c.id_cita || c.id} style={{ height: `calc(${numBlocks * 100}% - 4px)` }} onClick={(e) => {e.stopPropagation(); setCitaSeleccionada(c)}} className="absolute top-0.5 left-0.5 right-0.5 rounded bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#f1f5f9_10px,#f1f5f9_20px)] border border-slate-200 opacity-80 flex items-center justify-center hover:opacity-100 z-20 cursor-pointer">
                                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-slate-100">Bloqueado</span>
                                      </div>
                                    )
                                  }

                                  return (
                                    <div 
                                      key={c.id_cita || c.id} 
                                      style={{ height: `calc(${numBlocks * 100}% - 4px)` }}
                                      onClick={(e) => { e.stopPropagation(); setCitaSeleccionada(c) }}
                                      className={`absolute top-0.5 left-0.5 right-0.5 border-l-4 rounded p-1.5 shadow-sm overflow-hidden z-20 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer ${bgClass}`}
                                    >
                                      <div>
                                        <p className="font-bold text-[11px] leading-tight truncate">{c.nombre_paciente}</p>
                                        <p className="text-[9px] truncate opacity-80 mt-0.5 font-medium flex items-center gap-1">
                                          {isLate && <span>⚠️</span>} {c.motivo}
                                        </p>
                                      </div>
                                      <div className="flex items-center justify-between mt-1 text-[9px] font-black opacity-80">
                                        <span>{c.hora_cita.substring(0,5)}</span>
                                        <div className="flex gap-1 text-xs">
                                          {isTerminado ? '✅' : isEnCaja ? '🛒' : isCheckedIn ? '🛋️' : isLate ? '⏳' : ''}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                                {/* Hover Indicator para espacios libres */}
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

              {/* COLUMNA DERECHA: MINI-CALENDARIO Y NOTIFICACIONES */}
              <div className="w-[320px] flex flex-col py-4 pr-6 gap-6 overflow-y-auto hidden lg:flex bg-white z-10 shrink-0 border-l border-slate-200">
                
                {/* 1. Mini Calendario Visual */}
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
                          onClick={() => { setFechaSeleccionada(d.iso); setVistaAgenda('Dia'); }}
                          className={`w-9 h-9 flex flex-col items-center justify-center rounded-full mx-auto cursor-pointer relative transition-colors ${d.iso === fechaSeleccionada ? 'bg-[#0066FF] text-white shadow-md' : d.iso === hoyFechaFormat ? 'bg-blue-50 text-[#0066FF]' : d.enMes ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300'}`}
                        >
                          <span>{d.dateObj.getDate()}</span>
                          {hasCitas && d.iso !== fechaSeleccionada && <div className="absolute bottom-1 w-1 h-1 bg-amber-400 rounded-full"></div>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <hr className="border-slate-100"/>

                {/* 2. Flujo Clínico (Sala y Caja) */}
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
                    {pacientesEnEspera.map(t => (
                      <div key={t.id_transaccion} className="bg-white p-3.5 rounded-xl shadow-sm border border-sky-200 border-l-4 border-l-sky-500 relative">
                        <span className="absolute top-3 right-3 text-[9px] bg-sky-100 text-sky-700 font-black px-1.5 py-0.5 rounded uppercase">En Sala</span>
                        <p className="text-xs font-black text-slate-800 pr-12 truncate">{t.cliente}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">{t.concepto_historico}</p>
                        {esAdmin && <Link href={`/paciente/${t.id_paciente || t.ID_Paciente}`} className="mt-2.5 block text-center bg-sky-50 border border-sky-100 text-sky-700 text-[10px] font-bold py-1.5 rounded hover:bg-sky-500 hover:text-white transition-colors">Abrir Expediente</Link>}
                      </div>
                    ))}
                    {pacientesEnCaja.map(t => (
                      <div key={t.id_transaccion} className="bg-white p-3.5 rounded-xl shadow-sm border border-amber-200 border-l-4 border-l-amber-500 relative">
                        <span className="absolute top-3 right-3 text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase animate-pulse">Por Cobrar</span>
                        <p className="text-xs font-black text-slate-800 pr-16 truncate">{t.cliente}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold">Total: ${t.monto_cobrado || t.Monto_Cobrado}</p>
                        <button onClick={() => setCobroActivo(t)} className="mt-2.5 w-full block text-center bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold py-1.5 rounded hover:bg-amber-500 hover:text-white transition-colors">Procesar Pago</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Recordatorios Express (WhatsApp) - Sólo Asistente */}
                {!esAdmin && (
                  <>
                    <hr className="border-slate-100"/>
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
                            const tel = getTelefonoPaciente(c.id_paciente)
                            const mensaje = `Hola ${c.nombre_paciente}, te confirmamos tu cita de ${c.motivo} el día de mañana a las ${c.hora_cita.substring(0,5)} hrs con la Nutrióloga Marla Polo.\n\nPor favor responde 1 para confirmar o 2 para reagendar. ¡Excelente día! 🌿`
                            return (
                              <div key={c.id_cita || c.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors">
                                <p className="text-xs font-bold text-slate-800 truncate">{c.nombre_paciente}</p>
                                <p className="text-[9px] text-slate-500 mb-2 mt-0.5 font-bold">{c.hora_cita.substring(0,5)} hrs • {c.motivo}</p>
                                {tel ? (
                                  <a href={`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`} target="_blank" className="flex items-center justify-center gap-1.5 w-full bg-[#25D366]/10 text-[#128C7E] text-[10px] font-black py-1.5 rounded-lg hover:bg-[#25D366] hover:text-white transition-colors">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                    Confirmar
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
          )}

          {/* ==================== VISTA 2: PACIENTES ==================== */}
          {activeTab === 'Pacientes' && (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 sm:px-8 sm:py-8 border-b border-slate-100 bg-slate-50 flex gap-4 items-center">
                    <span className="text-slate-400 text-xl">🔍</span>
                    <input type="text" placeholder="Buscar expediente por nombre o teléfono..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent border-none text-lg font-black outline-none text-slate-800 placeholder:text-slate-300"/>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {pacientesFiltrados.map(p => {
                      const pId = p.id_paciente || p.ID_Paciente
                      return (
                        <div key={pId} className="flex justify-between items-center p-6 sm:px-8 hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center font-black text-sm border border-blue-100 shrink-0">{getInitials(p.nombre_completo || p.Nombre_Completo)}</div>
                            <div>
                              <Link href={`/paciente/${pId}`} className="text-base font-black text-slate-800 group-hover:text-[#0066FF] transition-colors">{p.nombre_completo || p.Nombre_Completo}</Link>
                              <p className="text-xs text-slate-500 mt-1 font-medium">📞 {p.telefono || p.Telefono} • {getTextoUltimaVisita(pId, biDatos.ultimasVisitasDict)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => copiarEnlacePortal(pId)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
                              🔗 Copiar Link Portal
                            </button>
                            <Link href={`/paciente/${pId}`} className="text-slate-300 group-hover:text-[#0066FF] text-xl font-black">&rarr;</Link>
                          </div>
                        </div>
                      )
                    })}
                    {pacientesFiltrados.length === 0 && <div className="p-12 text-center text-slate-400 text-sm font-bold">No se encontraron pacientes.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== VISTA 3: ESTELA BI (FINANZAS) ==================== */}
          {activeTab === 'Finanzas' && esAdmin && (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-6xl mx-auto space-y-6">
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-900 to-slate-900 text-white">
                  <div>
                    <h2 className="font-black text-2xl flex items-center gap-2">📊 Estela BI <span className="bg-blue-500 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">Pro</span></h2>
                    <p className="text-sm text-blue-200 mt-1">Analítica y reportes de desempeño de tu clínica.</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <select value={filtroTiempo} onChange={(e) => setFiltroTiempo(e.target.value)} className="p-2.5 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer">
                      <option value="Mes Actual">Mes Actual</option><option value="Mes Anterior">Mes Anterior</option><option value="Últimos 3 Meses">Últimos 3 Meses</option>
                    </select>
                    <button onClick={() => mostrarToast("Reporte Programado (Llegará los días 1 de cada mes)", "exito")} className="bg-[#0066FF] hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                      📧 Programar PDF Auto
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[ 
                    { t: 'Ingresos Totales', v: `$${biDatos.kpis.ingresosTotales.toLocaleString('es-MX')}`, color: 'text-[#0066FF]' }, 
                    { t: 'Consultas Efectivas', v: biDatos.kpis.totalTrx, color: 'text-slate-800' }, 
                    { t: 'Servicios Clínicos', v: `$${biDatos.kpis.ingresosServicios.toLocaleString('es-MX')}`, color: 'text-emerald-600' }, 
                    { t: 'Ventas Farmacia', v: `$${biDatos.kpis.ingresosFarmacia.toLocaleString('es-MX')}`, color: 'text-purple-600' },
                    { t: 'Ausentismo (No-Show)', v: `${biDatos.kpis.porcentajeAusentismo}%`, color: 'text-rose-600', extra: `${biDatos.kpis.citasCanceladasMes} canceladas este mes` } 
                  ].map((c, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
                      {c.t.includes('Ausentismo') && <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>}
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{c.t}</p>
                      <p className={`text-3xl font-black tracking-tight ${c.color}`}>{c.v}</p>
                      {c.extra && <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">{c.extra}</p>}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rescate CRM Avanzado */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-black text-slate-800 mb-1 flex items-center gap-2">🚨 Panel de Rescate CRM</h3>
                    <p className="text-xs text-slate-500 mb-6">Pacientes con riesgo de abandono de tratamiento (&gt;30 días).</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead><tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-widest"><th className="pb-3">Paciente</th><th className="pb-3">Ausencia</th><th className="pb-3 text-right">Recuperación</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {biDatos.alertasCRM.length === 0 ? (
                            <tr><td colSpan={3} className="py-10 text-center text-sm text-slate-400 font-bold">Sin riesgo de abandono. ¡Excelente retención!</td></tr>
                          ) : biDatos.alertasCRM.slice(0, 8).map((p:any, i:number) => {
                            const isGrave = p.dias_ausente > 60
                            const txtGrave = isGrave ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                            return (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 font-bold text-slate-700">{p.nombre_completo || p.Nombre_Completo}</td>
                              <td className="py-4"><span className={`border px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider ${txtGrave}`}>{p.dias_ausente} días</span></td>
                              <td className="py-4 text-right">
                                {p.telefono || p.Telefono ? (
                                  <a href={`https://wa.me/${String(p.telefono || p.Telefono).replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${p.nombre_completo || p.Nombre_Completo}, habla Marla Polo. Revisando mis expedientes noté que no te he visto en un tiempo. ¿Cómo vas con tus metas? ¡Me encantaría verte pronto!`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 bg-[#25D366]/10 text-[#128C7E] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#25D366] hover:text-white transition-all">📲 Escribir</a>
                                ) : <span className="text-[10px] text-slate-300 font-bold uppercase">Sin Tel.</span>}
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top Farmacia Visual */}
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
              </div>
            </div>
          )}

          {/* ==================== VISTA 4: ALMACÉN ==================== */}
          {activeTab === 'Almacen' && esAdmin && (
            <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
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
    </div>
  )
}
