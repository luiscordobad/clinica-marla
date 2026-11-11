"use client"

import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Cierra la sesión sola tras X minutos sin actividad (útil en una
// computadora compartida, ej. recepción). minutos null/0/undefined = desactivado.
export function useCierreAutomatico(minutos: number | null | undefined) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!minutos || minutos <= 0) return

    const cerrarPorInactividad = async () => {
      await supabase.auth.signOut()
      window.location.href = '/login?inactividad=1'
    }

    const reiniciarTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(cerrarPorInactividad, minutos * 60 * 1000)
    }

    const eventos = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    eventos.forEach(e => window.addEventListener(e, reiniciarTimer))
    reiniciarTimer()

    return () => {
      eventos.forEach(e => window.removeEventListener(e, reiniciarTimer))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [minutos])
}
