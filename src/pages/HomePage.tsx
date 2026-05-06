import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { MoveRight, ShieldCheck, Star, Trophy, Truck, Zap, Shirt, Globe2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

/* ─── Categories ──────────────── */
const CATEGORIES = [
  { name: 'Brasileirão', icon: Shirt, count: 22, image: '/jersey/brasileirao/Corinthians/Corinthians-72.jpeg' },
  { name: 'LaLiga', icon: Trophy, count: 11, image: '/jersey/LaLiga/Real Madrid/Real-Madrid-1.jpeg' },
  { name: 'Premier League', icon: Globe2, count: 18, image: '/jersey/Premier league/Manchester City/Manchester-City-9.jpeg' },
  { name: 'Serie A', icon: Star, count: 10, image: '/jersey/Serie A/Milan/Milan-7.jpeg' },
  { name: 'Ligue 1', icon: ShieldCheck, count: 11, image: '/jersey/Liga1/Paris Saint Germain/PSG-24.jpeg' },
  { name: 'Bundesliga', icon: Trophy, count: 11, image: '/jersey/Bundesliga/Borussia Dortmund/Borussia-Dortmund-5.jpeg' },
  { name: 'Seleções Mundiais', icon: Globe2, count: 42, image: '/jersey/Mundial/Brasil/brasil2026azul 2.jpg' },
]

const STATS = [
  { value: 30, suffix: '+', label: 'Modelos exclusivos' },
  { value: 500, suffix: '+', label: 'Clientes satisfeitos' },
  { value: 27, suffix: '', label: 'Estados atendidos' },
  { value: 100, suffix: '%', label: 'Camisas originais' },
]

const TESTIMONIALS = [
  { name: 'Lucas M.', text: 'Qualidade incrível! A camisa do Vasco chegou perfeita, tecido de primeira.', rating: 5 },
  { name: 'Ana C.', text: 'Atendimento via WhatsApp foi super rápido. Recomendo demais!', rating: 5 },
  { name: 'Pedro S.', text: 'Já comprei 3 camisas e todas vieram impecáveis. Virei cliente fiel.', rating: 5 },
]

const PERKS = [
  { icon: Truck, label: 'Entrega rápida', desc: 'Enviamos para todo o Brasil' },
  { icon: ShieldCheck, label: 'Qualidade garantida', desc: 'Produtos de primeira linha' },
  { icon: Zap, label: 'Pedido via WhatsApp', desc: 'Atendimento direto e rápido' },
]

/* ─── Animation variants ──────────────── */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const } },
}
const fadeLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const } },
}
const fadeRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const } },
}
const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const } },
}

/* ─── Animated Counter Component ──────────────── */
function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 2000
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      setCount(Math.floor(progress * value))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, value])

  return <span ref={ref}>{count}{suffix}</span>
}

/* ─── Section Wrapper with Scroll Reveal ──────────────── */
function ScrollSection({ children, className = '', variant = 'fadeUp' }: { children: React.ReactNode; className?: string; variant?: 'fadeUp' | 'fadeLeft' | 'fadeRight' | 'scaleIn' }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const variants = { fadeUp, fadeLeft, fadeRight, scaleIn }[variant]

  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={variants} className={className}>
      {children}
    </motion.div>
  )
}

export function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4, 1], [1, 0.6, 0])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1])

  const [currentFrame, setCurrentFrame] = useState(0)
  const totalFrames = 80

  useEffect(() => {
    let frame = 0
    let direction = 1
    let lastTime = performance.now()
    const fps = 24
    const interval = 1000 / fps
    let animationFrameId: number

    const preloadFrames = (start: number, count: number, dir: number) => {
      for (let i = 1; i <= count; i++) {
        let nextFrame = start + (i * dir)
        if (nextFrame >= totalFrames) nextFrame = totalFrames - 1
        if (nextFrame < 0) nextFrame = 0
        const img = new Image()
        img.src = `/hero-sequence/Football_jersey2_${String(nextFrame).padStart(3, '0')}.jpg`
      }
    }

    const loop = (time: number) => {
      const deltaTime = time - lastTime
      if (deltaTime >= interval) {
        frame += direction
        if (frame >= totalFrames - 1) { frame = totalFrames - 1; direction = -1 }
        else if (frame <= 0) { frame = 0; direction = 1 }
        setCurrentFrame(frame)
        preloadFrames(frame, 3, direction)
        lastTime = time - (deltaTime % interval)
      }
      animationFrameId = requestAnimationFrame(loop)
    }

    animationFrameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  const [mundialProducts, setMundialProducts] = useState<any[]>([])

  useEffect(() => {
    async function fetchMundial() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('league', 'selecoes')
        .eq('featured', true)
        .order('order_priority', { ascending: true })
      if (data) setMundialProducts(data)
    }
    fetchMundial()
  }, [])

  return (
    <div className="pb-12">
      {/* ════════════════════════════════════════════
          SECTION 1 - HERO - Cinematic Entry
         ════════════════════════════════════════════ */}
      <div ref={heroRef} className="relative min-h-screen bg-background overflow-hidden flex items-center">
        {/* Ambient Glows */}
        <motion.div style={{ scale: heroScale, opacity: useTransform(scrollYProgress, [0, 1], [0.5, 0.2]) }} className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
        <motion.div style={{ scale: heroScale, opacity: useTransform(scrollYProgress, [0, 1], [0.3, 0.1]) }} className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/5 blur-[150px] pointer-events-none" />

        {/* Image Sequence */}
        <motion.div style={{ scale: heroScale }} className="absolute inset-y-0 right-0 w-full lg:w-[90%] z-0 overflow-hidden">
          <motion.img src={`/hero-sequence/Football_jersey2_${String(currentFrame).padStart(3, '0')}.jpg`} alt="Hero" className="absolute top-0 left-0 h-full w-full object-cover object-[30%_center] lg:object-[45%_center] scale-[1.15] -translate-x-[4%] lg:-translate-x-[3%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent lg:bg-gradient-to-r lg:from-background lg:via-background/50 lg:to-transparent" />
        </motion.div>

        {/* Content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 w-full px-5 sm:px-10 lg:px-20 mx-auto max-w-[1600px] flex items-center pt-24 lg:pt-0">
          <div className="w-full max-w-[700px]">
            <motion.div variants={stagger} initial="hidden" animate="visible" className="glass-card rounded-[2rem] p-8 sm:p-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-8">
                <span className="px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase">Premium</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-[0.2em] font-medium">Coleção 2026</span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-[5rem] font-display font-extrabold leading-[1] tracking-tight text-white mb-6">
                VISTA A <br /><span className="text-gradient-gold">EXCELÊNCIA.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-10 max-w-[480px]">
                As camisas mais desejadas do mundo em uma experiência exclusiva. Sinta o peso do manto oficial.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link to="/produtos" className="btn-glow-primary group">
                  <span className="relative z-10 flex items-center gap-2">Explorar Coleção<MoveRight className="w-5 h-5 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Scroll hint */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-12 flex items-center gap-4 text-muted-foreground">
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} className="flex h-10 w-6 items-start justify-center rounded-full border border-white/20 pt-2">
                <div className="h-2 w-1 rounded-full bg-primary" />
              </motion.div>
              <span className="font-sans text-[10px] uppercase tracking-[0.2em] font-medium">Descubra mais</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 2 - PERKS - Floating Cards
         ════════════════════════════════════════════ */}
      <section className="relative z-10 -mt-12 px-4 sm:px-6">
        <ScrollSection className="mx-auto max-w-[1440px]">
          <div className="grid gap-4 sm:grid-cols-3">
            {PERKS.map((perk) => (
              <motion.div key={perk.label} variants={fadeUp} className="group flex items-center gap-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl px-6 py-8 transition-all duration-500 hover:border-primary/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(255,170,0,0.05)]">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:border-primary/30 group-hover:bg-primary/10">
                  <perk.icon className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(255,170,0,0.5)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white tracking-wide uppercase">{perk.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed font-medium">{perk.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollSection>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 3 - CATEGORIES - Parallax Reveal
         ════════════════════════════════════════════ */}
      <section className="section-shell px-4 sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <ScrollSection>
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <motion.div variants={fadeUp} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-[1px] w-8 bg-primary/50" />
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Navegue por</span>
                </div>
                <h2 className="text-4xl font-display font-bold text-white sm:text-5xl lg:text-6xl uppercase tracking-tight">
                  Categorias <span className="text-gradient-gold">Premium</span>
                </h2>
              </motion.div>
            </div>
          </ScrollSection>

          <ScrollSection>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map((cat, i) => (
                <motion.div key={cat.name} variants={i % 2 === 0 ? fadeLeft : fadeRight} className="group relative overflow-hidden rounded-[1.5rem] bg-card border border-border h-[320px] cursor-pointer">
                  <img src={cat.image} alt={cat.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <cat.icon className="h-5 w-5 text-primary" />
                      <h3 className="text-2xl font-display font-bold text-white tracking-tight">{cat.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{cat.count} camisas disponíveis</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 4 - STATS - Animated Counters
         ════════════════════════════════════════════ */}
      <section className="section-shell px-4 sm:px-6">
        <ScrollSection className="mx-auto max-w-[1440px]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] px-8 py-16">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative z-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-center">
              {STATS.map((stat) => (
                <motion.div key={stat.label} variants={scaleIn} className="space-y-3">
                  <div className="text-5xl sm:text-6xl font-display font-extrabold text-gradient-gold">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] font-semibold">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </ScrollSection>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 5 - MUNDIAL CAROUSEL
         ════════════════════════════════════════════ */}
      <section className="section-shell px-0 sm:px-0 overflow-hidden py-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 mb-8">
          <ScrollSection>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <motion.div variants={fadeUp} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-[1px] w-8 bg-primary/50" />
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Copa do Mundo 2026</span>
                </div>
                <h2 className="text-4xl font-display font-bold text-white sm:text-5xl lg:text-6xl uppercase tracking-tight">
                  Seleções <span className="text-gradient-gold">Mundiais</span>
                </h2>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Link to="/produtos" className="group inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:text-white transition-colors">
                  Ver todas<MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </div>
          </ScrollSection>
        </div>

        {mundialProducts.length > 0 && (
          <div className="relative w-full flex overflow-x-hidden group pb-8">
            {/* Gradient overlays for smooth edge fading */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            <motion.div 
              className="flex gap-6 px-4 shrink-0 min-w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: Math.max(40, mundialProducts.length * 3), ease: "linear", repeat: Infinity }}
            >
              {/* Render twice for seamless loop */}
              {[...mundialProducts, ...mundialProducts].map((product, i) => (
                <Link
                  key={`${product.id}-${i}`}
                  to={`/produtos/${product.id}`}
                  className="group/card relative w-[260px] sm:w-[300px] overflow-hidden rounded-2xl bg-card border border-white/10 transition-all hover:border-primary/50 block shrink-0"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img src={product.image_url} alt={product.title} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent opacity-80" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                    <h3 className="text-xl font-display font-bold text-white tracking-tight group-hover/card:text-primary transition-colors line-clamp-1">{product.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-white/70">R$ {product.price?.toFixed(2).replace('.', ',')}</p>
                  </div>
                </Link>
              ))}
            </motion.div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════
          SECTION 6 - TESTIMONIALS - Carousel
         ════════════════════════════════════════════ */}
      <section className="section-shell px-4 sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <ScrollSection>
            <div className="text-center mb-12">
              <motion.div variants={fadeUp} className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="h-[1px] w-8 bg-primary/50" />
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Depoimentos</span>
                  <span className="h-[1px] w-8 bg-primary/50" />
                </div>
                <h2 className="text-4xl font-display font-bold text-white sm:text-5xl lg:text-6xl uppercase tracking-tight">
                  O que dizem nossos <span className="text-gradient-gold">clientes</span>
                </h2>
              </motion.div>
            </div>
          </ScrollSection>

          <ScrollSection>
            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <motion.div key={t.name} variants={fadeUp} className="group rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 transition-all duration-500 hover:border-primary/20">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 text-primary fill-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 7 - CTA - Final Call to Action
         ════════════════════════════════════════════ */}
      <section className="px-4 pb-8 sm:px-6">
        <ScrollSection className="mx-auto max-w-[1440px]">
          <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] px-8 py-16 text-center sm:px-14 sm:py-24 shadow-2xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative z-10 mx-auto max-w-2xl space-y-8">
              <motion.div variants={scaleIn} className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                <Trophy className="h-10 w-10 text-primary drop-shadow-[0_0_10px_rgba(255,170,0,0.5)]" strokeWidth={1.5} />
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-4xl font-display font-bold text-white sm:text-5xl lg:text-6xl uppercase tracking-tight">
                Encontre o Manto <br /><span className="text-gradient-gold">Perfeito</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-sm text-muted-foreground sm:text-base leading-relaxed max-w-[500px] mx-auto font-medium">
                Mais de 30 modelos exclusivos disponíveis. Brasileirão, Champions, e edições especiais com atendimento VIP.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link to="/produtos" className="btn-glow-primary group mx-auto">
                  <span className="relative z-10 flex items-center gap-2">Explorar Coleção<MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </ScrollSection>
      </section>
    </div>
  )
}
