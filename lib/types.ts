// Tipos alineados 1:1 con el esquema de Supabase (ver migraciones).
// Nada de nombres duplicados en dos formatos (snake_case / PascalCase): el
// esquema nuevo es consistente, así que estos tipos son la única fuente de verdad.

export type RolUsuario = 'full_access' | 'operativo'

export type Usuario = {
  id: string
  email: string
  nombre: string
  rol: RolUsuario
  activo: boolean
  created_at: string
}

export type Paciente = {
  id: string
  nombre_completo: string
  fecha_nacimiento: string | null
  genero: string | null
  telefono: string | null
  correo: string | null
  origen: string | null
  residencia: string | null
  escolaridad: string | null
  profesion: string | null
  activo: boolean
  fecha_registro: string
  created_by: string | null
  updated_at: string
}

export type TipoCita =
  | 'primera_vez'
  | 'seguimiento'
  | 'solo_inbody'
  | 'enzimas'
  | 'en_linea'
  | 'bloqueo'

export type EstadoCita = 'programada' | 'en_espera' | 'completada' | 'cancelada' | 'ausente'

export type Cita = {
  id: string
  paciente_id: string | null
  nombre_paciente: string | null
  fecha_cita: string
  hora_cita: string
  duracion_min: number
  tipo: TipoCita
  estado: EstadoCita
  notas: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TipoConsulta = 'primera_vez' | 'seguimiento'

// Estas formas jsonb son "libres" a propósito: reflejan exactamente las
// secciones del wizard clínico de Marla. Se documentan aquí para que el
// formulario y el guardado no se desincronicen. Al ser jsonb, Supabase no
// las valida — este tipo es la única fuente de verdad sobre su forma.
export type Antecedentes = {
  heredo_familiares?: string
  patologicos?: string
  cirugias?: string
  no_patologicos?: string
  laboratorios?: string
  medicamentos?: string
  suplementos_actuales?: string
  sueno?: string
  objetivos?: string
}

export type Mediciones = {
  circ_abdominal?: string
  circ_umbilical?: string
  pecho?: string
  gluteo?: string
  muslo?: string
  bicep_izq_reposo?: string
  bicep_der_reposo?: string
  realizar_plicometria?: 'Si' | 'No'
  plicometria?: Record<string, string> // 9 sitios (mm), clave = nombre del sitio
}

export type InBody = {
  peso_kg?: string
  musculo_esqu_kg?: string
  masa_grasa_kg?: string
  grasa_pct?: string
  grasa_visceral?: string
  tmb_kcal?: string
  agua_total_lt?: string
  peso_ideal_kg?: string
  grasa_bajar_kg?: string
  musculo_subir_kg?: string
}

export type EstiloVida = {
  alergias_intolerancias?: string
  agua_diaria?: string
  ansiedad?: string
  restricciones_alimentarias?: string
  alcohol?: string
  cigarro?: string
  vape?: string
  drogas?: string
  recordatorio_24h?: string
  alimentos_mas_consumidos?: string
  alimentos_menos_consumidos?: string
  actividad_fisica_freq?: string
  actividad_fisica_duracion?: string
  actividad_fisica_intensidad?: string
  deporte_disciplina?: string
}

export type EnfoqueNutricional = {
  enfoque?: string
  aporte_calorico?: string
  tiempos_comida?: string
  pct_carbohidratos?: string
  pct_proteinas?: string
  pct_grasas?: string
  notas_suplementos_recetados?: string
}

export type Consulta = {
  id: string
  paciente_id: string
  cita_id: string | null
  tipo: TipoConsulta
  fecha: string
  realizada_por: string | null
  antecedentes: Antecedentes
  mediciones: Mediciones
  inbody: InBody
  estilo_vida: EstiloVida
  enfoque_nutricional: EnfoqueNutricional
  notas_evolucion: string | null
  peso_actual: number | null
  porcentaje_grasa: number | null
  musculo_kg: number | null
  created_at: string
  updated_at: string
}

export type Producto = {
  id: string
  producto: string
  proveedor: string | null
  costo_unit: number
  precio_venta: number
  stock: number
  created_at: string
  updated_at: string
}

export type EstadoPago = 'pendiente_pago' | 'pagado' | 'cancelado'
export type TipoDescuento = 'ninguno' | 'porcentaje' | 'fijo'

export type Pago = {
  id: string
  paciente_id: string | null
  cita_id: string | null
  consulta_id: string | null
  concepto: string | null
  monto_esperado: number
  monto_efectivo: number
  monto_tarjeta: number
  monto_transferencia: number
  estado: EstadoPago
  requiere_factura: boolean
  descuento_tipo: TipoDescuento
  descuento_valor: number
  created_by: string | null
  fecha: string
  updated_at: string
}

export type PagoProducto = {
  id: string
  pago_id: string
  producto_id: string | null
  cantidad: number
  precio_unit: number
}

export type Gasto = {
  id: string
  fecha: string
  concepto: string
  categoria: string | null
  monto: number
  created_by: string | null
  created_at: string
}

export const DURACION_POR_TIPO: Record<TipoCita, number> = {
  primera_vez: 60,
  seguimiento: 30,
  solo_inbody: 15,
  enzimas: 45,
  en_linea: 30,
  bloqueo: 60,
}

export const ETIQUETA_TIPO_CITA: Record<TipoCita, string> = {
  primera_vez: 'Primera Vez',
  seguimiento: 'Consulta Subsecuente',
  solo_inbody: 'Solo InBody',
  enzimas: 'Aplicación de Enzimas',
  en_linea: 'Consulta en Línea',
  bloqueo: 'Bloqueo de Agenda',
}

export const PRECIO_SUGERIDO_POR_TIPO: Record<TipoCita, number> = {
  primera_vez: 1000,
  seguimiento: 800,
  solo_inbody: 500,
  enzimas: 4500,
  en_linea: 700,
  bloqueo: 0,
}
