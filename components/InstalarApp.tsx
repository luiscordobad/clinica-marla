"use client"

import { useEffect, useState } from 'react'

// Sección "Instalar como app" de Ajustes. Detecta el dispositivo y muestra
// el botón de instalación (Chrome/Edge) o los pasos manuales (iPhone/Safari).
export default function InstalarApp() {
  const [instalada, setInstalada] = useState(false)
  const [esIOS, setEsIOS] = useState(false)
  const [esSafariMac, setEsSafariMac] = useState(false)
  const [promptInstalacion, setPromptInstalacion] = useState<any>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    setEsIOS(ios)
    setEsSafariMac(!ios && ua.includes('Macintosh') && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua))
    setInstalada(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)

    const alOfrecer = (e: Event) => { e.preventDefault(); setPromptInstalacion(e) }
    const alInstalar = () => { setInstalada(true); setPromptInstalacion(null) }
    window.addEventListener('beforeinstallprompt', alOfrecer)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alOfrecer)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  const instalar = async () => {
    if (!promptInstalacion) return
    promptInstalacion.prompt()
    await promptInstalacion.userChoice
    setPromptInstalacion(null)
  }

  const paso = (n: number, texto: React.ReactNode) => (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-[#28363E] dark:bg-[#4A6472] text-white text-xs font-black flex items-center justify-center">{n}</span>
      <span className="text-sm text-slate-600 dark:text-slate-300 pt-0.5">{texto}</span>
    </li>
  )

  return (
    <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Instalar como app</p>
      {instalada ? (
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">✅ Ya estás usando Clínica Marla como app en este dispositivo.</p>
      ) : (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ábrela desde tu pantalla de inicio, a pantalla completa y sin barra del navegador.</p>
          {promptInstalacion ? (
            <button onClick={instalar} className="w-full py-3 bg-[#28363E] dark:bg-[#4A6472] text-white rounded-xl text-sm font-black hover:bg-[#1C262C] transition-colors">📲 Instalar Clínica Marla</button>
          ) : esIOS ? (
            <ol className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              {paso(1, <>Abre esta página en <b>Safari</b>.</>)}
              {paso(2, <>Toca el botón <b>Compartir</b> (el cuadro con la flecha hacia arriba).</>)}
              {paso(3, <>Elige <b>“Agregar a inicio”</b> y confirma con <b>Agregar</b>.</>)}
            </ol>
          ) : esSafariMac ? (
            <ol className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              {paso(1, <>En Safari, abre el menú <b>Archivo</b>.</>)}
              {paso(2, <>Elige <b>“Agregar al Dock”</b>.</>)}
            </ol>
          ) : (
            <ol className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              {paso(1, <>En Chrome o Edge, busca el ícono de <b>instalar</b> al final de la barra de direcciones.</>)}
              {paso(2, <>O abre el menú <b>⋮</b> y elige <b>“Instalar Clínica Marla”</b>.</>)}
            </ol>
          )}
        </>
      )}
    </div>
  )
}
