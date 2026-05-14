import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AnimatePresence,
  motion,
  type MotionValue,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import {
  Globe2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoveRight,
  ShieldCheck,
  Shirt,
  Star,
  Trophy,
  Truck,
  Users,
  Zap,
} from 'lucide-react'

import { resolveAssetUrl } from '../lib/assets'
import { supabase } from '../lib/supabase'

const HERO_INDEX_STORAGE_KEY = 'store-fanatic-hero-index'

type Testimonial = {
  id: string
  name: string
  text: string
  rating: number
  avatar_url?: string | null
}

type SiteStat = {
  id: string
  label: string
  value: number
  suffix: string
}

type Product = {
  id: string
  title: string
  image_url: string
  price: number
}

type HeroTeamCardData = {
  id: string
  images: string[]
  title: string
  subtitle: string
}

const HERO_TEAMS: HeroTeamCardData[] = [
  {
    id: 'real-madrid',
    images: [
      '/jersey/LaLiga/Real Madrid/Real-Madrid-1.jpeg',
      '/jersey/LaLiga/Real Madrid/Real-Madrid-2.jpeg',
      '/jersey/LaLiga/Real Madrid/Real-Madrid-5.jpeg',
    ],
    title: 'Real Madrid',
    subtitle: 'LaLiga',
  },
  {
    id: 'milan',
    images: [
      '/jersey/Serie-A/Milan/Milan-7.jpeg',
      '/jersey/Serie-A/Milan/Milan-11.jpeg',
      '/jersey/Serie-A/Milan/Milan-14.jpeg',
    ],
    title: 'Milan',
    subtitle: 'Serie A',
  },
  {
    id: 'man-city',
    images: [
      '/jersey/Premier-league/Manchester-City/Manchester-City-9.jpeg',
      '/jersey/Premier-league/Manchester-City/Manchester-City-3.jpeg',
      '/jersey/Premier-league/Manchester-City/Manchester-City-18.jpeg',
    ],
    title: 'Man City',
    subtitle: 'Premier League',
  },
  {
    id: 'psg',
    images: [
      '/jersey/Liga1/Paris-Saint-Germain/PSG-24.jpeg',
      '/jersey/Liga1/Paris-Saint-Germain/PSG-35.jpeg',
      '/jersey/Liga1/Paris-Saint-Germain/PSG-46.jpeg',
    ],
    title: 'PSG',
    subtitle: 'Ligue 1',
  },
  {
    id: 'dortmund',
    images: [
      '/jersey/Bundesliga/Borussia-Dortmund/Borussia-Dortmund-5.jpeg',
      '/jersey/Bundesliga/Borussia-Dortmund/Borussia-Dortmund-1.jpeg',
      '/jersey/Bundesliga/Borussia-Dortmund/Borussia-Dortmund-8.jpeg',
    ],
    title: 'Dortmund',
    subtitle: 'Bundesliga',
  },
  {
    id: 'brasil',
    images: [
      '/jersey/Mundial/Brasil/Brasil-1.jpeg',
      '/jersey/Mundial/Brasil/Brasil-2.jpeg',
      '/jersey/Mundial/Brasil/Brasil-3.jpeg',
    ],
    title: 'Brasil',
    subtitle: 'Selecoes',
  },
]

const HERO_CAROUSEL_POSITIONS = {
  [-2]: { x: -300, y: 56, scale: 0.78, rotate: -16, opacity: 0.26, zIndex: 10 },
  [-1]: { x: -180, y: 18, scale: 0.92, rotate: -8, opacity: 0.66, zIndex: 20 },
  [0]: { x: 0, y: -28, scale: 1.08, rotate: 0, opacity: 1, zIndex: 40 },
  [1]: { x: 180, y: 18, scale: 0.92, rotate: 8, opacity: 0.66, zIndex: 20 },
  [2]: { x: 300, y: 56, scale: 0.78, rotate: 16, opacity: 0.26, zIndex: 10 },
} as const

const PERKS = [
  { icon: Truck, label: 'Entrega rapida', desc: 'Postagem agil e envio para todo o Brasil.' },
  { icon: ShieldCheck, label: 'Qualidade garantida', desc: 'Acabamento premium e revisao antes do envio.' },
  { icon: Zap, label: 'Atendimento agil', desc: 'Suporte direto para tirar duvidas e fechar pedido.' },
]

const CATEGORIES = [
  { name: 'Brasileirao', league: 'brasileirao', icon: Shirt, image: '/jersey/brasileirao/Corinthians/Corinthians-72.jpeg' },
  { name: 'LaLiga', league: 'laliga', icon: Trophy, image: '/jersey/LaLiga/Real Madrid/Real-Madrid-1.jpeg' },
  { name: 'Premier League', league: 'premier-league', icon: Globe2, image: '/jersey/Premier-league/Manchester-City/Manchester-City-9.jpeg' },
  { name: 'Serie A', league: 'serie-a', icon: Star, image: '/jersey/Serie-A/Milan/Milan-7.jpeg' },
  { name: 'Ligue 1', league: 'ligue-1', icon: ShieldCheck, image: '/jersey/Liga1/Paris-Saint-Germain/PSG-24.jpeg' },
  { name: 'Bundesliga', league: 'bundesliga', icon: Trophy, image: '/jersey/Bundesliga/Borussia-Dortmund/Borussia-Dortmund-5.jpeg' },
  { name: 'Selecoes mundiais', league: 'selecoes', icon: Globe2, image: '/jersey/Mundial/Brasil/Brasil-1.jpeg' },
]

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

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  )
}

function ScrollSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function HeroCarouselCard({
  card,
  slot,
  smoothX,
  smoothY,
  shouldReduceMotion,
}: {
  card: HeroTeamCardData
  slot: -2 | -1 | 0 | 1 | 2
  smoothX: MotionValue<number>
  smoothY: MotionValue<number>
  shouldReduceMotion: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const [frame, setFrame] = useState(0)
  const position = HERO_CAROUSEL_POSITIONS[slot]
  const hoverRangeX = slot === 0 ? 12 : slot === -1 || slot === 1 ? 18 : 12
  const hoverRangeY = slot === 0 ? 16 : 12
  const driftX = useTransform(smoothX, [-1, 1], [-hoverRangeX, hoverRangeX])
  const driftY = useTransform(smoothY, [-1, 1], [-hoverRangeY, hoverRangeY])

  useEffect(() => {
    if (!hovered) {
      setFrame(0)
      return
    }

    const interval = window.setInterval(() => {
      setFrame((current) => (current + 1) % card.images.length)
    }, 2400)

    return () => window.clearInterval(interval)
  }, [card.images.length, hovered])

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ zIndex: position.zIndex }}
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{
        x: position.x,
        y: position.y,
        opacity: position.opacity,
        scale: position.scale,
        rotate: position.rotate,
      }}
      whileHover={shouldReduceMotion || slot !== 0 ? undefined : { y: position.y - 8, scale: 1.02 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <motion.div
        style={{ x: driftX, y: driftY }}
        className={`overflow-hidden rounded-[2rem] border border-white/10 bg-[#090909]/88 p-3 shadow-[0_26px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl ${
          slot === 0 ? 'w-[290px] sm:w-[380px]' : slot === -1 || slot === 1 ? 'w-[220px] sm:w-[270px]' : 'hidden w-[180px] md:block md:w-[220px]'
        }`}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#050505]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={`${card.title}-${frame}`}
              src={resolveAssetUrl(card.images[frame])}
              alt={card.title}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
              initial={{ opacity: 0, y: 36, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -36, scale: 1.03 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/20 to-transparent" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/85">{card.subtitle}</p>
            <p className={`mt-1 font-bold text-white ${slot === 0 ? 'text-xl' : 'text-sm sm:text-base'}`}>{card.title}</p>
          </div>
          <div className="flex gap-1.5">
            {card.images.map((_, index) => (
              <span
                key={`${card.title}-dot-${index}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === frame ? 'w-6 bg-primary' : 'w-1.5 bg-white/25'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion() ?? false
  const [carouselIndex, setCarouselIndex] = useState(0)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.45])
  const heroDepth = useTransform(scrollYProgress, [0, 1], [0, 120])

  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const smoothX = useSpring(pointerX, { stiffness: 120, damping: 18, mass: 0.5 })
  const smoothY = useSpring(pointerY, { stiffness: 120, damping: 18, mass: 0.5 })

  const heroRotateX = useTransform(smoothY, [-1, 1], [10, -10])
  const heroRotateY = useTransform(smoothX, [-1, 1], [-12, 12])
  const glowX = useTransform(smoothX, [-1, 1], ['35%', '65%'])
  const glowY = useTransform(smoothY, [-1, 1], ['30%', '70%'])
  const spotlight = useMotionTemplate`radial-gradient(circle at ${glowX} ${glowY}, rgba(229, 192, 123, 0.24), transparent 52%)`
  const orbLeftX = useTransform(smoothX, [-1, 1], [-30, 30])
  const orbLeftY = useTransform(smoothY, [-1, 1], [-26, 26])
  const orbRightX = useTransform(smoothX, [-1, 1], [40, -40])
  const orbRightY = useTransform(smoothY, [-1, 1], [30, -30])
  const stageX = useTransform(smoothX, [-1, 1], [-8, 8])
  const stageY = useTransform(smoothY, [-1, 1], [-10, 10])

  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [siteStats, setSiteStats] = useState<SiteStat[]>([])
  const [mundialProducts, setMundialProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSiteData() {
      const [testimonialsRes, statsRes, productsRes] = await Promise.all([
        supabase.from('testimonials').select('*').eq('active', true).order('order_priority', { ascending: true }),
        supabase.from('site_stats').select('*').order('order_priority', { ascending: true }),
        supabase.from('products').select('*').eq('league', 'selecoes').eq('featured', true).order('order_priority', { ascending: true }),
      ])

      if (testimonialsRes.data) setTestimonials(testimonialsRes.data as Testimonial[])
      if (statsRes.data) setSiteStats(statsRes.data as SiteStat[])
      if (productsRes.data) setMundialProducts(productsRes.data as Product[])
      setLoading(false)
    }

    fetchSiteData()
  }, [])

  useEffect(() => {
    const lastIndex = Number(window.localStorage.getItem(HERO_INDEX_STORAGE_KEY) ?? -1)
    let nextIndex = Math.floor(Math.random() * HERO_TEAMS.length)

    if (HERO_TEAMS.length > 1 && nextIndex === lastIndex) {
      nextIndex = (nextIndex + 1) % HERO_TEAMS.length
    }

    setCarouselIndex(nextIndex)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(HERO_INDEX_STORAGE_KEY, String(carouselIndex))
  }, [carouselIndex])

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return

    const bounds = heroRef.current?.getBoundingClientRect()
    if (!bounds) return

    const nextX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    const nextY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2

    pointerX.set(nextX)
    pointerY.set(nextY)
  }

  const resetPointer = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  const getCarouselSlot = (teamIndex: number) => {
    const total = HERO_TEAMS.length
    const raw = (teamIndex - carouselIndex + total) % total
    const normalized = raw > total / 2 ? raw - total : raw

    if (normalized < -2 || normalized > 2) return null
    return normalized as -2 | -1 | 0 | 1 | 2
  }

  const goToNextTeam = () => {
    setCarouselIndex((current) => (current + 1) % HERO_TEAMS.length)
  }

  const goToPreviousTeam = () => {
    setCarouselIndex((current) => (current - 1 + HERO_TEAMS.length) % HERO_TEAMS.length)
  }

  return (
    <div className="pb-12">
      <section
        ref={heroRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
        className="relative isolate min-h-screen overflow-hidden"
      >
        <motion.div style={{ opacity: heroOpacity }} className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f1a12_0%,#090909_45%,#030303_100%)]" />
          <div className="hero-grid absolute inset-0 opacity-60" />
          <motion.div
            style={{ x: orbLeftX, y: orbLeftY }}
            className="absolute left-[8%] top-[14%] h-56 w-56 rounded-full bg-primary/12 blur-[120px]"
          />
          <motion.div
            style={{ x: orbRightX, y: orbRightY }}
            className="absolute bottom-[8%] right-[10%] h-72 w-72 rounded-full bg-primary/10 blur-[160px]"
          />
          <motion.div
            style={{ y: heroDepth, scale: heroScale }}
            className="absolute inset-x-0 bottom-[-12rem] mx-auto h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-[140px]"
          />
        </motion.div>

        <motion.div style={{ backgroundImage: spotlight }} className="absolute inset-0 opacity-90" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] items-center px-4 pb-16 pt-28 sm:px-6 lg:pt-32">
          <div className="grid w-full gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: -18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/8 px-4 py-2 backdrop-blur-xl"
              >
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgba(229,192,123,0.9)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Drop da semana</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-3xl text-5xl font-black uppercase leading-[0.92] tracking-normal text-white sm:text-6xl lg:text-[5.4rem]"
              >
                Vista o
                <span className="block text-gradient-gold">manto.</span>
                <span className="block">Sinta o jogo.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 max-w-lg text-sm leading-7 text-white/68 sm:text-base"
              >
                Camisas de clubes e selecoes para quem vive futebol no detalhe. Escolha seu manto para o estadio, a resenha ou o dia a dia.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8 flex flex-col gap-4 sm:flex-row"
              >
                <Link to="/produtos" className="btn-glow-primary group">
                  <span className="relative z-10 flex items-center gap-2">
                    Escolher meu manto
                    <MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
                <a
                  href="#categorias"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-8 text-sm font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-white"
                >
                  Ver categorias
                </a>
              </motion.div>

            </div>

            <motion.div
              style={{ y: heroDepth }}
              className="relative flex min-h-[640px] items-center justify-center"
            >
              <motion.div
                style={{
                  rotateX: shouldReduceMotion ? 0 : heroRotateX,
                  rotateY: shouldReduceMotion ? 0 : heroRotateY,
                  transformPerspective: 1600,
                  x: stageX,
                  y: stageY,
                }}
                initial={{ opacity: 0, scale: 0.96, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-[920px]"
              >
                <div className="absolute inset-x-8 top-8 h-[520px] rounded-[2.5rem] border border-white/8 bg-white/[0.025] backdrop-blur-[18px]" />
                <div className="absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/14 blur-[130px]" />

                <div className="relative mx-auto h-[620px] max-w-[900px] overflow-hidden">
                  {HERO_TEAMS.map((card, index) => {
                    const slot = getCarouselSlot(index)
                    if (slot === null) return null

                    return (
                      <HeroCarouselCard
                        key={card.id}
                        card={card}
                        slot={slot}
                        smoothX={smoothX}
                        smoothY={smoothY}
                        shouldReduceMotion={shouldReduceMotion}
                      />
                    )
                  })}

                  <div className="absolute inset-x-0 bottom-0 z-50 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousTeam}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/75 backdrop-blur-xl transition-all hover:border-primary/35 hover:bg-primary/10 hover:text-white"
                      aria-label="Mostrar time anterior"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="rounded-full border border-white/10 bg-black/45 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/58 backdrop-blur-xl">
                      {HERO_TEAMS[carouselIndex]?.title}
                    </div>

                    <button
                      type="button"
                      onClick={goToNextTeam}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/75 backdrop-blur-xl transition-all hover:border-primary/35 hover:bg-primary/10 hover:text-white"
                      aria-label="Mostrar proximo time"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-10 px-4 sm:px-6">
        <ScrollSection className="mx-auto max-w-[1440px]">
          <div className="grid gap-4 sm:grid-cols-3">
            {PERKS.map((perk) => (
              <motion.div
                key={perk.label}
                whileHover={{ y: -4 }}
                className="group flex items-center gap-5 rounded-[1.75rem] border border-white/6 bg-white/[0.03] px-6 py-8 backdrop-blur-2xl transition-all duration-500 hover:border-primary/22 hover:bg-white/[0.05] hover:shadow-[0_24px_60px_rgba(229,192,123,0.08)]"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:border-primary/35 group-hover:bg-primary/10">
                  <perk.icon className="h-6 w-6 text-primary drop-shadow-[0_0_10px_rgba(229,192,123,0.5)]" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.08em] text-white">{perk.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{perk.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollSection>
      </section>

      <section id="categorias" className="section-shell px-4 sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <ScrollSection>
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-primary/50" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Navegue por</span>
                </div>
                <h2 className="text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Categorias <span className="text-gradient-gold">premium</span>
                </h2>
              </div>
            </div>
          </ScrollSection>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((category, index) => (
              <Link key={category.name} to={`/produtos?liga=${category.league}`} className="block">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.6 }}
                  className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-[1.5rem] border border-border bg-card sm:h-[320px] sm:aspect-auto"
                >
                  <img
                    src={resolveAssetUrl(category.image)}
                    alt={category.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="mb-2 flex items-center gap-3">
                      <category.icon className="h-5 w-5 shrink-0 text-primary" />
                      <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{category.name}</h3>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell px-4 sm:px-6">
        <ScrollSection className="mx-auto max-w-[1440px]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] px-6 py-16 sm:px-8">
            <div className="absolute left-1/2 top-0 h-full w-full max-w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
            {loading ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="relative z-10 grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
                {siteStats.map((stat) => (
                  <motion.div
                    key={stat.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="space-y-3"
                  >
                    <div className="text-4xl font-extrabold text-gradient-gold sm:text-5xl lg:text-6xl">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45 sm:text-xs">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ScrollSection>
      </section>

      {mundialProducts.length > 0 && (
        <section className="section-shell overflow-hidden px-0 py-10">
          <div className="mx-auto mb-8 max-w-[1440px] px-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-primary/50" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Copa do Mundo 2026</span>
                </div>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Selecoes <span className="text-gradient-gold">mundiais</span>
                </h2>
              </div>
              <Link to="/produtos" className="group inline-flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary transition-colors hover:text-white">
                Ver todas
                <MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="relative flex w-full overflow-x-hidden pb-8">
            <div className="absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-background to-transparent sm:w-16" />
            <div className="absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background to-transparent sm:w-16" />

            <motion.div
              className="flex min-w-max shrink-0 gap-4 px-4 sm:gap-6"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: Math.max(40, mundialProducts.length * 3), ease: 'linear', repeat: Infinity }}
            >
              {[...mundialProducts, ...mundialProducts].map((product, index) => (
                <Link
                  key={`${product.id}-${index}`}
                  to={`/produtos/${product.id}`}
                  className="group/card relative block w-[200px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-card transition-all hover:border-primary/50 sm:w-[260px] lg:w-[300px]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img
                      src={resolveAssetUrl(product.image_url)}
                      alt={product.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent opacity-80" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-5">
                    <h3 className="line-clamp-1 text-lg font-bold tracking-tight text-white transition-colors group-hover/card:text-primary sm:text-xl">
                      {product.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-white/70 sm:text-sm">R$ {product.price?.toFixed(2).replace('.', ',')}</p>
                  </div>
                </Link>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="section-shell px-4 sm:px-6">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-10 text-center sm:mb-12">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="h-px w-8 bg-primary/50" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Depoimentos</span>
                  <span className="h-px w-8 bg-primary/50" />
                </div>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
                  O que dizem nossos <span className="text-gradient-gold">clientes</span>
                </h2>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl transition-all duration-500 hover:border-primary/20 sm:p-8"
                >
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, index) => (
                      <Star key={index} className="h-3.5 w-3.5 fill-primary text-primary sm:h-4 sm:w-4" />
                    ))}
                  </div>
                  <p className="mb-6 text-xs leading-relaxed text-white/70 sm:text-sm">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 sm:h-10 sm:w-10">
                      {testimonial.avatar_url ? (
                        <img src={resolveAssetUrl(testimonial.avatar_url)} alt={testimonial.name} className="h-full w-full rounded-full object-cover" loading="lazy" />
                      ) : (
                        <Users className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-white sm:text-sm">{testimonial.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] px-6 py-16 text-center shadow-2xl sm:px-14 sm:py-24"
          >
            <div className="absolute left-1/2 top-0 h-full w-full max-w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
            <div className="relative z-10 mx-auto max-w-2xl space-y-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5 sm:h-20 sm:w-20">
                <Trophy className="h-8 w-8 text-primary drop-shadow-[0_0_10px_rgba(229,192,123,0.5)] sm:h-10 sm:w-10" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
                Encontre o manto <br />
                <span className="text-gradient-gold">perfeito</span>
              </h2>
              <p className="mx-auto max-w-[500px] text-sm leading-relaxed text-white/60 sm:text-base">
                Mais de 30 modelos exclusivos entre Brasileirao, Champions e edicoes especiais, com atendimento direto para quem quer comprar sem enrolacao.
              </p>
              <Link to="/produtos" className="btn-glow-primary group mx-auto inline-flex">
                <span className="relative z-10 flex items-center gap-2">
                  Explorar colecao
                  <MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
