import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Zap, Mail, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'register' | 'magic'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email })
        if (error) throw error
        setMessage({ type: 'success', text: 'Link enviado para o seu e-mail! Verifique a caixa de entrada.' })
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setMessage({ type: 'success', text: 'Acesso autorizado.' })
        window.location.href = '/'
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({ type: 'success', text: 'Conta criada! Verifique seu e-mail para ativar o acesso.' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Ocorreu um erro. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section-shell flex min-h-[calc(100vh-80px)] items-center justify-center px-3 sm:px-5">
      {/* Grid Background */}
      <div className="absolute inset-0 grid-overlay pointer-events-none opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="panel hud-border clip-path-panel relative w-full max-w-md px-8 py-10"
      >
        <div className="scanline opacity-40" />

        {/* Icon */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-background/80">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-display text-[10px] uppercase tracking-[0.42em] text-primary/70">
              Terminal de Acesso
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.14em] text-white">
              {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Magic Link'}
            </h1>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="mb-8 grid grid-cols-3 border border-white/10">
          {(['login', 'register', 'magic'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setMessage(null) }}
              className={`px-3 py-3 font-display text-[9px] uppercase tracking-[0.28em] transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              {m === 'login' ? 'Login' : m === 'register' ? 'Cadastro' : 'Magic'}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-accent/30 bg-accent/10 text-accent'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {/* E-mail */}
          <div>
            <label className="mb-2 block font-display text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input pl-11"
                placeholder="seuemail@exemplo.com"
              />
            </div>
          </div>

          {/* Password (not for magic link) */}
          {mode !== 'magic' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="mb-2 block font-display text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input pr-11"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'magic' && (
            <p className="text-sm text-muted-foreground leading-7">
              Enviaremos um link seguro para o seu e-mail. Nenhuma senha necessária.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group flex h-14 w-full items-center justify-center gap-3 bg-primary font-display text-sm uppercase tracking-[0.32em] text-primary-foreground transition-all hover:shadow-[0_0_45px_rgba(60,247,255,0.3)] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Zap className="h-5 w-5" />
                {mode === 'login' ? 'Acessar sistema' : mode === 'register' ? 'Criar acesso' : 'Enviar magic link'}
              </>
            )}
          </button>
        </form>

        {/* Decorative footer */}
        <div className="mt-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="font-display text-[9px] uppercase tracking-[0.38em] text-muted-foreground/50">
            Sessão criptografada
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </motion.div>
    </div>
  )
}
