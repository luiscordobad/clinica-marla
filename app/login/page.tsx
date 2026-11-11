"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { obtenerEstadoSesion } from '../../lib/auth'
import { useTema } from '../../lib/tema'

type Modo = 'login' | 'registro' | 'recuperar'

export default function Login() {
  const { tema, alternarTema } = useTema()
  const [modo, setModo] = useState<Modo>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('inactividad') === '1') {
      setAviso('Cerramos tu sesión automáticamente por inactividad. Vuelve a iniciar sesión.')
    }
  }, [])

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

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setAviso(null)

    const { error: recuperarError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    })

    if (recuperarError) {
      setError('No se pudo enviar el correo. Verifica que esté bien escrito e intenta de nuevo.')
      setLoading(false)
      return
    }

    setAviso('Si ese correo tiene una cuenta, te enviamos un link para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-slate-950 flex items-center justify-center p-4 relative">
      <button onClick={alternarTema} title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'} className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        {tema === 'dark' ? '☀️' : '🌙'}
      </button>
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-800">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-marla-completo.png" alt="Marla Polo — Nutrición Clínica & Diabetes" className="h-16 w-auto mx-auto mb-4 dark:brightness-0 dark:invert" />
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{modo === 'login' ? 'Inicia sesión en tu cuenta' : modo === 'registro' ? 'Crea tu cuenta de acceso' : 'Recupera el acceso a tu cuenta'}</p>
        </div>

        {aviso && (
          <div className="bg-slate-50 dark:bg-slate-800/60 text-[#28363E] dark:text-slate-300 p-4 rounded-xl text-sm text-center border border-slate-200 dark:border-slate-700 mb-6 font-medium">
            {aviso}
          </div>
        )}

        <form onSubmit={modo === 'login' ? handleLogin : modo === 'registro' ? handleRegistro : handleRecuperar} className="space-y-5">
          {modo === 'registro' && (
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800 dark:text-slate-100"
                placeholder="Marla Pérez"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800 dark:text-slate-100"
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          {modo !== 'recuperar' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300">Contraseña</label>
                {modo === 'login' && (
                  <button type="button" onClick={() => { setModo('recuperar'); setError(null); setAviso(null) }} className="text-xs font-bold text-[#28363E] dark:text-slate-300 hover:underline">¿Olvidaste tu contraseña?</button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800 dark:text-slate-100"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {modo === 'registro' && (
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Confirma tu contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#28363E] focus:border-[#28363E] outline-none transition-all text-slate-800 dark:text-slate-100"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 p-3 rounded-xl text-sm text-center border border-rose-200 dark:border-rose-800 font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#28363E] dark:bg-[#3D5360] text-white font-black py-3.5 rounded-xl hover:bg-[#1C262C] dark:hover:bg-[#4A6472] transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Un momento...' : modo === 'login' ? 'Entrar al Sistema' : modo === 'registro' ? 'Crear mi cuenta' : 'Enviar link de recuperación'}
          </button>
        </form>

        {modo === 'recuperar' ? (
          <button
            onClick={() => { setModo('login'); setError(null); setAviso(null) }}
            className="w-full text-center text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[#28363E] dark:hover:text-slate-200 transition-colors mt-6"
          >
            ← Regresar a iniciar sesión
          </button>
        ) : (
          <button
            onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(null); setAviso(null) }}
            className="w-full text-center text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[#28363E] dark:hover:text-slate-200 transition-colors mt-6"
          >
            {modo === 'login' ? '¿Personal nuevo? Crea tu cuenta aquí' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        )}

        {modo === 'registro' && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-3 leading-relaxed">
            Tu cuenta quedará pendiente hasta que un administrador la active desde la sección de Usuarios.
          </p>
        )}
      </div>
    </main>
  )
}
