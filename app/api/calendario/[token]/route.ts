import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { construirICS } from '../../../../lib/ics'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const { data, error } = await supabase.rpc('citas_para_calendario', { p_token: params.token })

  // Un token inválido y uno válido sin citas se ven igual a propósito:
  // así la URL no sirve para adivinar si un token existe.
  const eventos = error || !data ? [] : data

  const ics = construirICS(eventos)

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="clinica-marla.ics"',
      'Cache-Control': 'public, max-age=1800',
    },
  })
}
