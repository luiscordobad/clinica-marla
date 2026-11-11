"use client"

import { useEffect } from 'react'

// Registra el service worker (solo en producción) para que la app sea instalable
// y muestre una pantalla propia cuando no hay internet.
export default function RegistroSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
