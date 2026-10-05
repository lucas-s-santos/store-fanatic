import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { markIntroSeen } from '../../lib/intro'
import { cn } from '../../lib/utils'

// Versão leve da logo (9 KB) só para a abertura não esperar o PNG de 300 KB.
const LOGO = '/store-fanatic-448.webp'
/** Tempo da logo na tela antes da cortina subir. */
const SHOW_MS = 1500
/** Se a logo (e a fonte do nome) demorar mais que isso, a abertura é pulada. */
const LOGO_WAIT_MS = 1200

const EASE = [0.16, 1, 0.3, 1] as const
// Mesma curva de --ease-in-out-strong.
const CURTAIN_EASE = [0.77, 0, 0.175, 1] as const

/** Faíscas da tocha: espalhadas em volta, subindo um pouco como fogo. */
const EMBERS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1)
  const distance = 170 + (i % 3) * 60
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 40,
    size: 5 + (i % 3) * 3,
    flame: i % 2 === 0,
  }
})

/**
 * Logo pousando: cai com mola, a tocha acende atrás, no pouso saem duas
 * ondas amarelas e faíscas, e o nome sobe de dentro de uma máscara.
 */
function Logo() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <motion.span
          aria-hidden
          className="absolute -inset-16 rounded-full bg-flame/40 blur-3xl"
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 0.75] }}
          transition={{ duration: 1, times: [0, 0.45, 1], delay: 0.1, ease: EASE }}
        />

        {[0, 1].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute inset-0 rounded-[2rem] border-2 border-primary"
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 2.2 + i * 0.7, opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.9, delay: 0.32 + i * 0.12, ease: 'easeOut' }}
          />
        ))}

        {EMBERS.map((ember, i) => (
          <motion.span
            key={i}
            aria-hidden
            className={cn(
              'absolute left-1/2 top-1/2 rounded-full shadow-[0_0_14px_rgb(255_150_40/0.95)]',
              ember.flame ? 'bg-flame' : 'bg-primary',
            )}
            style={{ width: ember.size, height: ember.size, marginLeft: -ember.size / 2, marginTop: -ember.size / 2 }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
            animate={{ x: ember.x, y: ember.y, opacity: [0, 1, 0], scale: [0.5, 1, 0.3] }}
            transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
          />
        ))}

        <motion.div
          className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl"
          initial={{ scale: 0.3, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
        >
          <img src={LOGO} alt="" className="size-36 object-cover sm:size-44 lg:size-52" />
        </motion.div>
      </div>

      <div className="mt-7 overflow-hidden">
        <motion.p
          className="display-title text-[clamp(2.75rem,10vw,7rem)] leading-[1.05] text-foreground"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
        >
          Store <span className="text-primary">Fanatic</span>
        </motion.p>
      </div>
    </div>
  )
}

/**
 * Abertura da loja: refletores acendem, a logo pousa com o nome e a tela
 * sobe como cortina (com uma faixa amarela logo atrás). Clique, toque, tecla
 * ou rolagem pulam direto para a cortina.
 *
 * onReveal: a cortina começou a subir (a home já pode animar o hero).
 * onDone: a cortina saiu da tela (pode desmontar).
 */
export function SiteIntro({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const leavingRef = useRef(false)

  const leave = useCallback(() => {
    if (leavingRef.current) return
    leavingRef.current = true
    setLeaving(true)
    onReveal()
  }, [onReveal])

  // Sem trava de rolagem: rolar, tocar ou teclar já pula para a cortina.
  useEffect(markIntroSeen, [])

  // Só começa com a logo pronta (sem ela não há o que mostrar) e com a Anton
  // carregada, para o nome não piscar na fonte reserva.
  useEffect(() => {
    let active = true
    let timer = 0
    const img = new Image()
    img.src = LOGO
    const timeout = new Promise<never>((_, reject) => {
      timer = window.setTimeout(reject, LOGO_WAIT_MS)
    })
    const font = document.fonts.load('400 1em Anton').catch(() => undefined)
    Promise.race([Promise.all([img.decode(), font]), timeout])
      .then(() => {
        if (active && !leavingRef.current) setReady(true)
      })
      .catch(() => {
        if (active) leave()
      })
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [leave])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(leave, SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [ready, leave])

  useEffect(() => {
    window.addEventListener('keydown', leave)
    window.addEventListener('wheel', leave, { passive: true })
    return () => {
      window.removeEventListener('keydown', leave)
      window.removeEventListener('wheel', leave)
    }
  }, [leave])

  return (
    // Decorativa: leitores de tela vão direto para a página que está por baixo.
    <div
      aria-hidden
      onPointerDown={leave}
      className={cn('fixed inset-0 z-[200] cursor-pointer select-none', leaving && 'pointer-events-none')}
    >
      {/* Faixa amarela que sobe logo atrás da cortina. */}
      <motion.div
        className="absolute inset-0 bg-primary"
        animate={{ y: leaving ? '-100%' : 0 }}
        transition={{ duration: 0.75, delay: 0.12, ease: CURTAIN_EASE }}
        onAnimationComplete={() => leaving && onDone()}
      />

      <motion.div
        className="absolute inset-0 overflow-hidden bg-background"
        animate={{ y: leaving ? '-100%' : 0 }}
        transition={{ duration: 0.7, ease: CURTAIN_EASE }}
      >
        {/* Refletores acendendo (piscam antes de firmar), no lugar da luz do topo do site. */}
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(50rem_28rem_at_15%_-5%,rgb(255_194_26/0.18),transparent_70%),radial-gradient(45rem_28rem_at_85%_-5%,rgb(59_139_234/0.16),transparent_70%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.25, 1] }}
          transition={{ duration: 0.8, times: [0, 0.2, 0.35, 1], ease: 'easeOut' }}
        />

        <div className="relative flex h-full items-center justify-center">
          {/* Continua montada na saída: sobe junto com a cortina. */}
          {ready && <Logo />}
        </div>
      </motion.div>
    </div>
  )
}
