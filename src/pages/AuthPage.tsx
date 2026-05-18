import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Eye, EyeOff, Loader2, User, Lock,
  ArrowLeft, CheckCircle2, ShoppingBag,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'register' | 'forgot'

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'
  if (msg.includes('User already registered')) return 'Este e-mail já possui cadastro. Tente fazer login.'
  if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.'
  if (msg.includes('Unable to validate email')) return 'E-mail inválido.'
  if (msg.includes('For security purposes')) return 'Aguarde alguns segundos antes de tentar novamente.'
  if (msg.includes('Email rate limit')) return 'Muitas tentativas. Aguarde antes de tentar novamente.'
  return msg
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const checks = [
    password.length >= 6,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    password.length >= 10,
  ]
  const score = checks.filter(Boolean).length
  const bars = [
    score >= 1 ? (score <= 1 ? 'bg-destructive' : score <= 2 ? 'bg-[#FF9F43]' : 'bg-primary') : 'bg-white/10',
    score >= 2 ? (score <= 2 ? 'bg-[#FF9F43]' : 'bg-primary') : 'bg-white/10',
    score >= 3 ? 'bg-primary' : 'bg-white/10',
    score >= 4 ? 'bg-[#25D366]' : 'bg-white/10',
  ]
  const label = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][score]
  const labelColor = ['', 'text-destructive', 'text-[#FF9F43]', 'text-primary', 'text-[#25D366]'][score]

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {bars.map((cls, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${cls}`} />
        ))}
      </div>
      <p className={`text-[10px] font-semibold ${labelColor}`}>{label && `Senha ${label}`}</p>
    </div>
  )
}

interface FieldProps {
  label: string
  icon: React.ElementType
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  right?: React.ReactNode
}

function Field({ label, icon: Icon, type = 'text', value, onChange, placeholder, autoComplete, required, right }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="form-input w-full pl-10 pr-10 text-sm"
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </div>
  )
}

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextUrl = searchParams.get('next') || '/'

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const switchMode = (m: Mode) => { setMode(m); setError(''); setSuccess('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'register') {
      if (!name.trim()) { setError('Informe seu nome.'); return }
      if (password !== confirmPassword) { setError('As senhas não coincidem.'); return }
      if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() } },
        })
        if (signUpError) throw new Error(translateError(signUpError.message))

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: name.trim(),
          })
        }

        if (data.session) {
          navigate(nextUrl)
        } else {
          setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.')
        }
      } else if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw new Error(translateError(loginError.message))
        navigate(nextUrl)
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })
        if (resetError) throw new Error(translateError(resetError.message))
        setSuccess('Link enviado! Verifique seu e-mail para redefinir a senha.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir * 24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -24, opacity: 0 }),
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-xl">
            <img src="/store-fanatic.jpg" alt="Store Fanatic" className="h-full w-full object-cover" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/70">Store Fanatic</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === 'login' && 'Entre na sua conta'}
              {mode === 'register' && 'Crie sua conta gratuita'}
              {mode === 'forgot' && 'Redefinir senha'}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-[2rem] p-8 shadow-2xl">
          <AnimatePresence mode="wait" custom={mode === 'register' ? 1 : -1}>

            {/* ── ESQUECI SENHA ── */}
            {mode === 'forgot' ? (
              <motion.div
                key="forgot"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-5"
              >
                <button
                  onClick={() => switchMode('login')}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar ao login
                </button>

                <div>
                  <h2 className="text-xl font-display font-bold uppercase tracking-tight text-white">
                    Esqueceu a senha?
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Informe seu e-mail e enviaremos um link para redefinir sua senha.
                  </p>
                </div>

                {success ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/10 p-6 text-center"
                  >
                    <CheckCircle2 className="h-10 w-10 text-[#25D366]" />
                    <p className="text-sm font-semibold text-white">Link enviado!</p>
                    <p className="text-xs text-muted-foreground">{success}</p>
                    <button
                      onClick={() => switchMode('login')}
                      className="mt-1 text-xs font-bold text-primary hover:underline"
                    >
                      Voltar ao login
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Field
                      label="E-mail"
                      icon={Mail}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="seuemail@exemplo.com"
                      autoComplete="email"
                      required
                    />
                    {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02] active:scale-100 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link de redefinição'}
                    </button>
                  </form>
                )}
              </motion.div>

            ) : (
              /* ── LOGIN / CADASTRO ── */
              <motion.div
                key="main"
                variants={slideVariants}
                custom={-1}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-6"
              >
                {/* Tabs */}
                <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  {(['login', 'register'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      className={`flex-1 rounded-lg py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-200 ${
                        mode === m
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-white'
                      }`}
                    >
                      {m === 'login' ? 'Entrar' : 'Cadastrar'}
                    </button>
                  ))}
                </div>

                {/* Feedback */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-start gap-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" />
                      <p className="text-xs text-[#25D366]">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence initial={false}>
                    {mode === 'register' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Field
                          label="Nome completo"
                          icon={User}
                          value={name}
                          onChange={setName}
                          placeholder="Seu nome"
                          autoComplete="name"
                          required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Field
                    label="E-mail"
                    icon={Mail}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="seuemail@exemplo.com"
                    autoComplete="email"
                    required
                  />

                  <div>
                    <Field
                      label="Senha"
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={setPassword}
                      placeholder="••••••••"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      right={
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="text-muted-foreground transition-colors hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                    {mode === 'register' && <PasswordStrength password={password} />}
                  </div>

                  <AnimatePresence initial={false}>
                    {mode === 'register' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Field
                          label="Confirmar senha"
                          icon={Lock}
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          required
                          right={
                            <button
                              type="button"
                              onClick={() => setShowConfirm(v => !v)}
                              className="text-muted-foreground transition-colors hover:text-white"
                            >
                              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          }
                        />
                        {confirmPassword && password !== confirmPassword && (
                          <p className="mt-1.5 text-[10px] text-destructive">As senhas não coincidem.</p>
                        )}
                        {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[#25D366]">
                            <CheckCircle2 className="h-3 w-3" /> Senhas conferem
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {mode === 'login' && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-[10px] font-semibold text-muted-foreground transition-colors hover:text-primary"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:scale-100"
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : mode === 'login' ? 'Entrar na conta' : 'Criar minha conta'}
                  </button>
                </form>

                {/* Link para loja */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Link
                    to="/"
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-white"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Continuar comprando sem conta
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
