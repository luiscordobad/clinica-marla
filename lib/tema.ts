"use client"

import { useEffect, useState } from 'react'

type Tema = 'light' | 'dark'

function aplicarClase(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'dark')
}

// Preferencia de modo oscuro/claro, guardada por dispositivo (localStorage).
export function useTema() {
  const [tema, setTemaState] = useState<Tema>('light')

  useEffect(() => {
    try {
      const inicial: Tema = window.localStorage.getItem('tema') === 'dark' ? 'dark' : 'light'
      setTemaState(inicial)
      aplicarClase(inicial)
    } catch { /* localStorage no disponible, se queda en claro */ }
  }, [])

  const cambiarTema = (nuevo: Tema) => {
    setTemaState(nuevo)
    aplicarClase(nuevo)
    try { window.localStorage.setItem('tema', nuevo) } catch { /* ignorar */ }
  }

  const alternarTema = () => cambiarTema(tema === 'dark' ? 'light' : 'dark')

  return { tema, cambiarTema, alternarTema }
}
