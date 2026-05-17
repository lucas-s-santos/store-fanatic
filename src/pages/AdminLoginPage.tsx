import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Zap, Mail, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      // Reload page to let the protected route catch the session
      window.location.href = '/admin'
    } catch (err: any) {
      setErrorMsg('Credenciais inválidas ou erro no servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030303] px-4" translate="no">
      <div className="absolute inset-0 grid-overlay pointer-events-none opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl"
      >
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">
              Acesso Restrito
            </p>
            <h1 className="mt-1 text-2xl font-display font-bold uppercase tracking-widest text-white">
              Painel Admin
            </h1>
          </div>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              E-mail Administrativo
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input pl-11 bg-white/5 border-white/10"
                placeholder="admin@loja.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input pr-11 bg-white/5 border-white/10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-glow-primary mt-4 flex h-14 w-full items-center justify-center gap-3"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Acessar Painel
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
