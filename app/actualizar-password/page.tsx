"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function ActualizarPassword() {
  const [verificando, setVerificando] = useState(true)
  const [sesionValida, setSesionValida] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const verificar = async () => {
      // El link de recuperación crea una sesión temporal automáticamente
      // (supabase-js detecta el token en la URL). Puede tardar un instante.
      const { data: { session } } = await supabase.auth.getSession()
      setSesionValida(!!session)
      setVerificando(false)
    }
    verificar()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden.')

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) return setError('No se pudo actualizar la contraseña: ' + updateError.message)
    setListo(true)
    setTimeout(() => { window.location.href = '/' }, 2000)
  }

  return (
    <main className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-marla-completo.png" alt="Marla Polo — Nutrición Clínica & Diabetes" className="h-16 w-auto mx-auto mb-4" />
          <p className="text-slate-500 mt-1 text-sm">Establece tu nueva contraseña</p>
        </div>

        {verificando ? (
          <p className="text-center text-sm text-slate-400 py-6 animate-pulse">Verificando link...</p>
        ) : !sesionValida ? (
          <div className="text-center space-y-4">
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm border border-rose-200 font-medium">
              Este link no es válido o ya expiró. Solicita uno nuevo desde la pantalla de inicio de sesión.
            </div>
            <Link href="/login" className="inline-block text-sm font-bold text-[#28363E] hover:underline">← Volver a iniciar sesión</Link>
          </div>
        ) : listo ? (
          <div className="bg-slate-50 text-[#28363E] p-4 rounded-xl text-sm text-center border border-slate-200 font-medium">
            ¡Listo! Tu contraseña se actualizó. Entrando al sistema...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Confirma tu nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm text-center border border-rose-200 font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#28363E] text-white font-black py-3.5 rounded-xl hover:bg-[#1C262C] transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
