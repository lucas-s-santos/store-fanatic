import { useEffect, useId, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Eye, EyeOff, Loader2, User, Lock,
  ArrowLeft, CheckCircle2, Phone, Package, Truck, QrCode,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { optimizedImageUrl } from '../lib/assets'
import { fetchShowcaseProducts, shuffle } from '../lib/catalog'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

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
    score >= 1 ? (score <= 1 ? 'bg-destructive' : score <= 2 ? 'bg-warning' : 'bg-primary') : 'bg-muted',
    score >= 2 ? (score <= 2 ? 'bg-warning' : 'bg-primary') : 'bg-muted',
    score >= 3 ? 'bg-primary' : 'bg-muted',
    score >= 4 ? 'bg-success' : 'bg-muted',
  ]
  const label = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][score]
  const labelColor = ['', 'text-destructive', 'text-warning', 'text-primary', 'text-success'][score]

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {bars.map((cls, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${cls}`} />
        ))}
      </div>
      <p className={`text-xs font-semibold ${labelColor}`} aria-live="polite">{label && `Senha ${label.toLowerCase()}`}</p>
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
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="form-input w-full pl-11 pr-12 text-sm"
        />
        {right && <span className="absolute inset-y-0 right-2 flex items-center">{right}</span>}
      </div>
    </div>
  )
}

function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Esconder senha' : 'Mostrar senha'}
      aria-pressed={shown}
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
    >
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )
}

const PERKS = [
  { icon: Package, label: 'Acompanhe seus pedidos' },
  { icon: QrCode, label: 'Pague via PIX' },
  { icon: Truck, label: 'Envio para todo o Brasil' },
]

/** Mosaico de camisas do lado esquerdo (só no desktop). */
function JerseyWall() {
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    let active = true
    fetchShowcaseProducts()
      .then((products) => {
        if (!active) return
        setImages(shuffle(products.filter((p) => p.image_url)).slice(0, 6).map((p) => p.image_url))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="relative hidden overflow-hidden rounded-[2rem] bg-card lg:block">
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-2 p-2">
        {(images.length ? images : Array.from({ length: 6 }, () => '')).map((url, i) => (
          <div key={i} className={cn('overflow-hidden rounded-2xl bg-muted', i % 2 === 1 && 'translate-y-6')}>
            {url && <img src={optimizedImageUrl(url, 360)} alt="" className="size-full object-cover" loading="lazy" />}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
      <div className="absolute inset-x-0 bottom-0 p-10">
        <h2 className="display-title text-6xl">
          Sua próxima
          <br />
          <span className="text-highlight">camisa</span> te espera.
        </h2>
        <ul className="mt-6 space-y-2.5">
          {PERKS.map((perk) => (
            <li key={perk.label} className="flex items-center gap-3 font-semibold text-foreground/90">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                <perk.icon className="size-4" aria-hidden />
              </span>
              {perk.label}
            </li>
          ))}
        </ul>
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
  const [phone, setPhone] = useState('')
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
            phone: phone.trim() || null,
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
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir * 24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -24, opacity: 0 }),
  }

  const fieldReveal = {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.22 },
    className: 'overflow-hidden',
  }

  return (
    <div className="page-shell px-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:min-h-[calc(100vh-12rem)] lg:grid-cols-2 lg:gap-12">
        <JerseyWall />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex w-full max-w-md flex-col justify-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="mb-8"
            >
              <h1 className="display-title text-5xl sm:text-6xl">
                {mode === 'login' && 'Entrar'}
                {mode === 'register' && 'Criar conta'}
                {mode === 'forgot' && 'Recuperar senha'}
              </h1>
              <p className="mt-3 text-muted-foreground">
                {mode === 'login' && 'Acompanhe seus pedidos e finalize compras mais rápido.'}
                {mode === 'register' && 'É grátis e leva menos de um minuto.'}
                {mode === 'forgot' && 'Informe seu e-mail e enviamos um link para criar uma nova senha.'}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <AnimatePresence mode="wait" custom={mode === 'register' ? 1 : -1}>
              {mode === 'forgot' ? (
                /* ── ESQUECI SENHA ── */
                <motion.div
                  key="forgot"
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  <button
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" />
                    Voltar para o login
                  </button>

                  {success ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      role="status"
                      className="flex flex-col items-center gap-3 rounded-2xl border border-success/25 bg-success/10 p-6 text-center"
                    >
                      <CheckCircle2 className="size-10 text-success" aria-hidden />
                      <p className="font-bold">Link enviado!</p>
                      <p className="text-sm text-muted-foreground">{success}</p>
                      <Button variant="ghost" onClick={() => switchMode('login')}>
                        Voltar para o login
                      </Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
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
                      {error && (
                        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                          {error}
                        </p>
                      )}
                      <Button type="submit" size="xl" disabled={loading} className="w-full">
                        {loading ? <Loader2 className="animate-spin" /> : 'Enviar link'}
                      </Button>
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
                  <div className="relative flex rounded-full border border-border bg-background/60 p-1" role="tablist" aria-label="Entrar ou criar conta">
                    {(['login', 'register'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={mode === m}
                        onClick={() => switchMode(m)}
                        className="relative flex-1 rounded-full py-2.5 text-sm font-bold"
                      >
                        {mode === m && (
                          <motion.div
                            layoutId="tab-indicator"
                            className="absolute inset-0 rounded-full bg-primary"
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                        )}
                        <span className={cn('relative z-10 transition-colors duration-200', mode === m ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          {m === 'login' ? 'Entrar' : 'Criar conta'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        role="alert"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                      >
                        {error}
                      </motion.p>
                    )}
                    {success && (
                      <motion.div
                        role="status"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3"
                      >
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        <p className="text-sm text-success">{success}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence initial={false}>
                      {mode === 'register' && (
                        <motion.div key="name-field" {...fieldReveal}>
                          <Field
                            label="Nome completo"
                            icon={User}
                            value={name}
                            onChange={setName}
                            placeholder="Seu nome completo"
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

                    <AnimatePresence initial={false}>
                      {mode === 'register' && (
                        <motion.div key="phone-field" {...fieldReveal}>
                          <Field
                            label="WhatsApp (opcional)"
                            icon={Phone}
                            type="tel"
                            value={phone}
                            onChange={setPhone}
                            placeholder="(11) 99999-9999"
                            autoComplete="tel"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

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
                        right={<RevealButton shown={showPassword} onToggle={() => setShowPassword(v => !v)} />}
                      />
                      {mode === 'register' && <PasswordStrength password={password} />}
                    </div>

                    <AnimatePresence initial={false}>
                      {mode === 'register' && (
                        <motion.div key="confirm-field" {...fieldReveal}>
                          <Field
                            label="Confirmar senha"
                            icon={Lock}
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            required
                            right={<RevealButton shown={showConfirm} onToggle={() => setShowConfirm(v => !v)} />}
                          />
                          {confirmPassword && password !== confirmPassword && (
                            <p className="mt-1.5 text-xs font-medium text-destructive">As senhas não coincidem.</p>
                          )}
                          {confirmPassword && password === confirmPassword && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-success">
                              <CheckCircle2 className="size-3.5" aria-hidden /> Senhas conferem
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
                          className="text-sm font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                    )}

                    <Button type="submit" size="xl" disabled={loading} className="mt-2 w-full">
                      {loading ? <Loader2 className="animate-spin" /> : mode === 'login' ? 'Entrar' : 'Criar minha conta'}
                    </Button>
                  </form>

                  <div className="border-t border-border pt-5 text-center">
                    <Link to="/produtos" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                      Voltar para a loja
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Ao criar uma conta, você concorda com os Termos de Uso e a Política de Privacidade da loja.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
