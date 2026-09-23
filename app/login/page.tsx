"use client"

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { obtenerEstadoSesion } from '../../lib/auth'

type Modo = 'login' | 'registro'

export default function Login() {
  const [modo, setModo] = useState<Modo>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const entrarSegunEstado = async () => {
    const estado = await obtenerEstadoSesion()
    if (estado.tipo === 'activa') {
      window.location.href = '/'
      return
    }
    if (estado.tipo === 'pendiente_aprobacion') {
      setAviso('Tu cuenta se creó correctamente. Un administrador (Marla o Luis) debe activarla antes de que puedas entrar. Te avisarán cuando ya puedas usar el sistema.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }
    if (estado.tipo === 'inactiva') {
      setAviso('Tu cuenta existe pero está desactivada. Pide a un administrador que la reactive desde la sección de Usuarios.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }
    setError('No se pudo verificar tu sesión. Intenta de nuevo.')
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setAviso(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    await entrarSegunEstado()
  }

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setAviso(null)

    if (!nombre.trim()) { setError('Escribe tu nombre completo.'); setLoading(false); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); setLoading(false); return }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); setLoading(false); return }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre: nombre.trim() } },
    })

    if (signUpError) {
      setError(signUpError.message.includes('already registered')
        ? 'Ese correo ya tiene una cuenta. Intenta iniciar sesión.'
        : signUpError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      // Supabase requiere confirmar el correo antes de dar sesión.
      setAviso('Cuenta creada. Revisa tu correo y confirma tu cuenta desde el enlace que te enviamos; después podrás iniciar sesión.')
      setModo('login')
      setLoading(false)
      return
    }

    await entrarSegunEstado()
  }

  return (
    <main className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-marla-completo.png" alt="Marla Polo — Nutrición Clínica & Diabetes" className="h-16 w-auto mx-auto mb-4" />
          <p className="text-slate-500 mt-1 text-sm">{modo === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta de acceso'}</p>
        </div>

        {aviso && (
          <div className="bg-slate-50 text-[#28363E] p-4 rounded-xl text-sm text-center border border-slate-200 mb-6 font-medium">
            {aviso}
          </div>
        )}

        <form onSubmit={modo === 'login' ? handleLogin : handleRegistro} className="space-y-5">
          {modo === 'registro' && (
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800"
                placeholder="Marla Pérez"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800"
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800"
              placeholder="••••••••"
              required
            />
          </div>

          {modo === 'registro' && (
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Confirma tu contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800"
                placeholder="••••••••"
                required
              />
            </div>
          )}

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
            {loading ? 'Un momento...' : modo === 'login' ? 'Entrar al Sistema' : 'Crear mi cuenta'}
          </button>
        </form>

        <button
          onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(null); setAviso(null) }}
          className="w-full text-center text-sm font-bold text-slate-500 hover:text-[#28363E] transition-colors mt-6"
        >
          {modo === 'login' ? '¿Personal nuevo? Crea tu cuenta aquí' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>

        {modo === 'registro' && (
          <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
            Tu cuenta quedará pendiente hasta que un administrador la active desde la sección de Usuarios.
          </p>
        )}
      </div>
    </main>
  )
}
