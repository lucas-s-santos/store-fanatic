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

const HERO_FALLBACK: HeroTeamCardData[] = [
  {
    id: 'brasil',
    images: [
      '/jersey/Mundial/Brasil/Brasil-1.jpeg',
      '/jersey/Mundial/Brasil/Brasil-2.jpeg',
      '/jersey/Mundial/Brasil/Brasil-3.jpeg',
    ],
    title: 'Brasil',
    subtitle: 'Copa 2026',
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
  { icon: Truck, label: 'Entrega rápida', desc: 'Postagem ágil e envio para todo o Brasil.' },
  { icon: ShieldCheck, label: 'Qualidade garantida', desc: 'Acabamento premium e revisão antes do envio.' },
  { icon: Zap, label: 'Atendimento ágil', desc: 'Suporte direto para tirar dúvidas e fechar pedido.' },
]

const CATEGORIES_FALLBACK = [
  { name: 'Brasileirão', league: 'brasileirao', icon: Shirt, image: '/jersey/brasileirao/Corinthians/Corinthians-72.jpeg', logo_url: 'https://res.cloudinary.com/drdxlvlk4/image/upload/campeonatos/campeonato_brasileiro_de_futebol.png' },
  { name: 'Seleções Mundiais', league: 'selecoes', icon: Globe2, image: '/jersey/Mundial/Brasil/Brasil-1.jpeg', logo_url: 'https://res.cloudinary.com/drdxlvlk4/image/upload/campeonatos/logo-fifa.png' },
]

const MUNDIAL_PER_PAGE = 4

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
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
  const AUTO_PLAY_MS = 4000
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [autoPlayKey, setAutoPlayKey] = useState(0)

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
  const [heroCards, setHeroCards] = useState<HeroTeamCardData[]>(HERO_FALLBACK)
  const [categories, setCategories] = useState(CATEGORIES_FALLBACK)

  // Testimonials carousel state
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [isTestimonialsPaused, setIsTestimonialsPaused] = useState(false)

  // Mundial paginated carousel state
  const [mundialPage, setMundialPage] = useState(0)
  const [isMundialPaused, setIsMundialPaused] = useState(false)
  const [mundialDirection, setMundialDirection] = useState(1)

  const totalMundialPages = Math.ceil(mundialProducts.length / MUNDIAL_PER_PAGE)
  const currentMundialProducts = mundialProducts.slice(
    mundialPage * MUNDIAL_PER_PAGE,
    (mundialPage + 1) * MUNDIAL_PER_PAGE,
  )

  useEffect(() => {
    async function fetchSiteData() {
      const [testimonialsRes, statsRes, productsRes, heroRes, leaguesRes] = await Promise.all([
        supabase.from('testimonials').select('*').eq('active', true).order('order_priority', { ascending: true }),
        supabase.from('site_stats').select('*').order('order_priority', { ascending: true }),
        supabase.from('products').select('*').eq('league', 'selecoes').eq('featured', true).order('order_priority', { ascending: true }),
        supabase.from('products').select('id, title, name, image_url, league, team').eq('active', true).order('team').limit(120),
        supabase.from('leagues').select('id, name, logo_url').order('name'),
      ])

      if (testimonialsRes.data) setTestimonials(testimonialsRes.data as Testimonial[])
      if (statsRes.data) setSiteStats(statsRes.data as SiteStat[])
      if (productsRes.data) setMundialProducts(productsRes.data as Product[])

      // Build hero cards from real products grouped by team
      if (heroRes.data && heroRes.data.length > 0) {
        const teamMap = new Map<string, HeroTeamCardData>()
        for (const p of heroRes.data) {
          const key = (p.team || p.id) as string
          if (!teamMap.has(key) && teamMap.size < 6) {
            teamMap.set(key, {
              id: key,
              images: [],
              title: (p.name || p.title || key) as string,
              subtitle: p.league === 'selecoes' ? 'Copa 2026' : 'Brasileirão',
            })
          }
          const card = teamMap.get(key)
          if (card && card.images.length < 3 && p.image_url) {
            card.images.push(resolveAssetUrl(p.image_url))
          }
        }
        const cards = Array.from(teamMap.values()).filter(c => c.images.length > 0)
        if (cards.length > 0) setHeroCards(cards)
      }

      // Build categories from leagues in DB
      if (leaguesRes.data && leaguesRes.data.length > 0) {
        const ICON_MAP: Record<string, typeof Shirt> = {
          brasileirao: Shirt,
          selecoes: Globe2,
        }

        // Fetch one background image per league in parallel
        const bgResults = await Promise.all(
          leaguesRes.data.map(l =>
            supabase.from('products').select('league, image_url').eq('league', l.id).eq('active', true).not('image_url', 'is', null).limit(1)
          )
        )
        const bgMap: Record<string, string> = {}
        bgResults.forEach(r => {
          if (r.data?.[0]?.image_url) bgMap[r.data[0].league] = r.data[0].image_url
        })

        const built = leaguesRes.data.map(l => ({
          name: l.name as string,
          league: l.id as string,
          icon: ICON_MAP[l.id] || Trophy,
          image: bgMap[l.id] ? resolveAssetUrl(bgMap[l.id]) : '',
          logo_url: l.logo_url ? resolveAssetUrl(l.logo_url) : '',
        })).filter(c => c.logo_url || c.image)

        if (built.length > 0) setCategories(built)
      }

      setLoading(false)
    }

    fetchSiteData()
  }, [])

  useEffect(() => {
    if (heroCards.length === 0) return
    const lastIndex = Number(window.localStorage.getItem(HERO_INDEX_STORAGE_KEY) ?? -1)
    let nextIndex = Math.floor(Math.random() * heroCards.length)

    if (heroCards.length > 1 && nextIndex === lastIndex) {
      nextIndex = (nextIndex + 1) % heroCards.length
    }

    setCarouselIndex(nextIndex)
  }, [heroCards.length])

  useEffect(() => {
    window.localStorage.setItem(HERO_INDEX_STORAGE_KEY, String(carouselIndex))
  }, [carouselIndex])

  useEffect(() => {
    const id = setTimeout(() => {
      setCarouselIndex((c) => (c + 1) % heroCards.length)
      setAutoPlayKey((k) => k + 1)
    }, AUTO_PLAY_MS)
    return () => clearTimeout(id)
  }, [carouselIndex])

  // Testimonials auto-play
  useEffect(() => {
    if (isTestimonialsPaused || testimonials.length === 0) return
    const timer = setInterval(() => {
      setTestimonialIndex((i) => (i + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isTestimonialsPaused, testimonials.length])

  // Mundial auto-play
  useEffect(() => {
    if (isMundialPaused || mundialProducts.length === 0 || totalMundialPages <= 1) return
    const timer = setInterval(() => {
      setMundialDirection(1)
      setMundialPage((p) => (p + 1) % totalMundialPages)
    }, 3500)
    return () => clearInterval(timer)
  }, [isMundialPaused, mundialProducts.length, totalMundialPages])

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
    const total = heroCards.length
    const raw = (teamIndex - carouselIndex + total) % total
    const normalized = raw > total / 2 ? raw - total : raw

    if (normalized < -2 || normalized > 2) return null
    return normalized as -2 | -1 | 0 | 1 | 2
  }

  const goToNextTeam = () => {
    setCarouselIndex((current) => (current + 1) % heroCards.length)
    setAutoPlayKey((k) => k + 1)
  }

  const goToPreviousTeam = () => {
    setCarouselIndex((current) => (current - 1 + heroCards.length) % heroCards.length)
    setAutoPlayKey((k) => k + 1)
  }

  const goMundialPrev = () => {
    setMundialDirection(-1)
    setMundialPage((p) => (p - 1 + totalMundialPages) % totalMundialPages)
  }

  const goMundialNext = () => {
    setMundialDirection(1)
    setMundialPage((p) => (p + 1) % totalMundialPages)
  }

  const goTestimonialPrev = () => {
    setTestimonialIndex((i) => (i - 1 + testimonials.length) % testimonials.length)
  }

  const goTestimonialNext = () => {
    setTestimonialIndex((i) => (i + 1) % testimonials.length)
  }

  return (
    <div className="pb-12">
      {/* ── Hero ── */}
      <section
        ref={heroRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
        className="relative isolate min-h-screen overflow-hidden"
      >
        <motion.div style={{ opacity: heroOpacity }} className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f1a12_0%,#090909_45%,#030303_100%)]" />
          <div className="hero-grid absolute inset-0 opacity-20" />
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
            className="absolute inset-x-0 bottom-[-12rem] mx-auto h-[24rem] w-[24rem] rounded-full bg-primary/6 blur-[140px]"
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
                className="max-w-3xl text-4xl font-black uppercase leading-[0.92] tracking-normal text-white sm:text-5xl md:text-6xl lg:text-[5.4rem]"
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
                Camisas de clubes e seleções para quem vive futebol no detalhe. Escolha seu manto para o estádio, a resenha ou o dia a dia.
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
              className="relative flex min-h-[300px] items-center justify-center sm:min-h-[440px] lg:min-h-[640px]"
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
                <div className="relative mx-auto h-[280px] max-w-[900px] overflow-hidden sm:h-[420px] md:h-[620px]">
                  {heroCards.map((card, index) => {
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

                  <div className="absolute inset-x-0 bottom-2 z-50 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={goToPreviousTeam}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/65 backdrop-blur-xl transition-all hover:border-primary/35 hover:bg-primary/10 hover:text-white"
                      aria-label="Mostrar time anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="relative h-[2px] w-20 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        key={autoPlayKey}
                        className="absolute inset-y-0 left-0 rounded-full bg-primary"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: AUTO_PLAY_MS / 1000, ease: 'linear' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={goToNextTeam}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/65 backdrop-blur-xl transition-all hover:border-primary/35 hover:bg-primary/10 hover:text-white"
                      aria-label="Mostrar próximo time"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="pointer-events-none absolute bottom-7 left-1/2 z-20 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-8 w-5 items-start justify-center rounded-full border border-white/15 pt-[5px]"
          >
            <motion.div
              animate={{ opacity: [0.55, 0.15, 0.55], y: [0, 3, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="h-[6px] w-[3px] rounded-full bg-white/40"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Perks ── */}
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

      {/* ── Categorias / Ligas ── */}
      <section id="categorias" className="section-shell px-4 sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <ScrollSection>
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-primary/50" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Navegue por campeonato</span>
                </div>
                <h2 className="text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Ligas <span className="text-gradient-gold">& Seleções</span>
                </h2>
              </div>
              <Link
                to="/produtos"
                className="group inline-flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary transition-colors hover:text-white"
              >
                Ver todo catálogo
                <MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </ScrollSection>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category, index) => (
              <Link key={category.league} to={`/produtos?liga=${category.league}`} className="block">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.07, duration: 0.55 }}
                  whileHover={{ y: -5 }}
                  className="group relative h-[220px] cursor-pointer overflow-hidden rounded-[1.75rem] border border-white/8 bg-[#0c0c0c] transition-all duration-500 hover:border-primary/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)] sm:h-[240px]"
                >
                  {/* Background: product image blurred */}
                  {category.image && (
                    <img
                      src={category.image}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-15 blur-[3px] transition-all duration-700 group-hover:opacity-25 group-hover:blur-0 group-hover:scale-105"
                    />
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/75" />

                  {/* Glow on hover */}
                  <div className="absolute inset-0 rounded-[1.75rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(circle_at_50%_0%,rgba(229,192,123,0.06),transparent_65%)]" />

                  {/* Content centered */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5">
                    {category.logo_url ? (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute h-20 w-20 rounded-full bg-white/5 blur-2xl" />
                        <img
                          src={category.logo_url}
                          alt={category.name}
                          loading="lazy"
                          className="relative h-[68px] w-[68px] object-contain drop-shadow-[0_4px_18px_rgba(255,255,255,0.18)] transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/8 transition-all duration-500 group-hover:border-primary/45 group-hover:bg-primary/15">
                        <category.icon className="h-7 w-7 text-primary" />
                      </div>
                    )}

                    <h3 className="text-center text-sm font-bold uppercase tracking-[0.07em] text-white transition-colors duration-300 group-hover:text-primary sm:text-base">
                      {category.name}
                    </h3>

                    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55 transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary">
                      Ver coleção
                      <MoveRight className="h-3 w-3" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials (carousel) ── */}
      {testimonials.length > 0 && (
        <section className="section-shell px-4 sm:px-6">
          <div className="mx-auto max-w-[1440px]">
            <ScrollSection>
              <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="h-px w-8 bg-primary/50" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Depoimentos</span>
                  </div>
                  <h2 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
                    O que dizem nossos <span className="text-gradient-gold">clientes</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goTestimonialPrev}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition-all hover:border-primary/40 hover:bg-primary/8 hover:text-white"
                    aria-label="Depoimento anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goTestimonialNext}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition-all hover:border-primary/40 hover:bg-primary/8 hover:text-white"
                    aria-label="Próximo depoimento"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </ScrollSection>

            <div
              className="relative"
              onMouseEnter={() => setIsTestimonialsPaused(true)}
              onMouseLeave={() => setIsTestimonialsPaused(false)}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonialIndex}
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -32 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.025] p-8 backdrop-blur-xl sm:p-12 lg:p-16"
                >
                  <div className="pointer-events-none absolute right-8 top-4 select-none text-[7rem] font-black leading-none text-primary/6 sm:text-[10rem]">
                    "
                  </div>

                  <div className="mb-5 flex gap-1">
                    {Array.from({ length: testimonials[testimonialIndex].rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>

                  <p className="relative z-10 max-w-4xl text-base font-light leading-relaxed text-white/85 sm:text-xl lg:text-2xl">
                    "{testimonials[testimonialIndex].text}"
                  </p>

                  <div className="mt-8 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                      {testimonials[testimonialIndex].avatar_url ? (
                        <img
                          src={resolveAssetUrl(testimonials[testimonialIndex].avatar_url!)}
                          alt={testimonials[testimonialIndex].name}
                          className="h-full w-full rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white">{testimonials[testimonialIndex].name}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/60">
                        Cliente verificado
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="mt-6 flex items-center justify-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTestimonialIndex(i)}
                    aria-label={`Ir para depoimento ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === testimonialIndex ? 'w-8 bg-primary' : 'w-1.5 bg-white/20 hover:bg-white/35'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Stats ── */}
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

      {/* ── Mundial carousel (paginated, pause on hover, navigation) ── */}
      {mundialProducts.length > 0 && (
        <section className="section-shell px-4 sm:px-6">
          <div className="mx-auto max-w-[1440px]">
            <ScrollSection>
              <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="h-px w-8 bg-primary/50" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Copa do Mundo 2026</span>
                  </div>
                  <h2 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
                    Seleções <span className="text-gradient-gold">mundiais</span>
                  </h2>
                </div>
                <Link
                  to="/produtos"
                  className="group inline-flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary transition-colors hover:text-white"
                >
                  Ver todas
                  <MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </ScrollSection>

            <div
              className="relative"
              onMouseEnter={() => setIsMundialPaused(true)}
              onMouseLeave={() => setIsMundialPaused(false)}
            >
              {/* Prev arrow */}
              {totalMundialPages > 1 && (
                <button
                  type="button"
                  onClick={goMundialPrev}
                  aria-label="Página anterior"
                  className="absolute -left-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a] text-white/60 shadow-lg transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-white sm:-left-6"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}

              {/* Cards */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mundialPage}
                  initial={{ opacity: 0, x: mundialDirection * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mundialDirection * -40 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                >
                  {currentMundialProducts.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                    >
                      <Link
                        to={`/produtos/${product.id}`}
                        className="group/card relative block overflow-hidden rounded-2xl border border-white/10 bg-card transition-all hover:border-primary/50 hover:shadow-[0_20px_50px_rgba(229,192,123,0.12)]"
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
                          <h3 className="line-clamp-1 text-base font-bold tracking-tight text-white transition-colors group-hover/card:text-primary sm:text-lg">
                            {product.title}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-white/70 sm:text-sm">
                            R$ {product.price?.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Next arrow */}
              {totalMundialPages > 1 && (
                <button
                  type="button"
                  onClick={goMundialNext}
                  aria-label="Próxima página"
                  className="absolute -right-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a] text-white/60 shadow-lg transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-white sm:-right-6"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {/* Page dots + auto-play progress */}
              {totalMundialPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {Array.from({ length: totalMundialPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setMundialDirection(i > mundialPage ? 1 : -1)
                        setMundialPage(i)
                      }}
                      aria-label={`Ir para página ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === mundialPage ? 'w-8 bg-primary' : 'w-1.5 bg-white/20 hover:bg-white/35'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA final ── */}
      <section className="px-4 pb-8 pt-6 sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] shadow-2xl"
          >
            <div className="absolute left-1/2 top-0 h-full w-full max-w-[900px] -translate-x-1/2 rounded-full bg-primary/8 blur-[140px]" />
            <div className="hero-grid absolute inset-0 opacity-[0.07]" />

            <div className="relative z-10 grid gap-0 lg:grid-cols-2">
              {/* Left: CTA */}
              <div className="flex flex-col justify-center px-8 py-16 sm:px-14 sm:py-20">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                  <Trophy className="h-8 w-8 text-primary drop-shadow-[0_0_10px_rgba(229,192,123,0.5)]" strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Encontre o manto <br />
                  <span className="text-gradient-gold">perfeito</span>
                </h2>
                <p className="mt-6 max-w-[480px] text-sm leading-relaxed text-white/58 sm:text-base">
                  Mais de 30 modelos exclusivos entre Brasileirão, Champions e edições especiais. Atendimento direto para quem quer comprar sem enrolação.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link to="/produtos" className="btn-glow-primary group">
                    <span className="relative z-10 flex items-center gap-2">
                      Explorar coleção
                      <MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                  <Link
                    to="/produtos?liga=selecoes"
                    className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-8 text-sm font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-white"
                  >
                    Ver seleções
                  </Link>
                </div>
              </div>

              {/* Right: feature list */}
              <div className="flex flex-col justify-center border-t border-white/5 px-8 py-14 sm:px-14 sm:py-20 lg:border-l lg:border-t-0">
                <p className="mb-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Por que a Store Fanatic?</p>
                <div className="space-y-7">
                  {PERKS.map((perk) => (
                    <div key={perk.label} className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/8">
                        <perk.icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{perk.label}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-white/50">{perk.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Star rating badge */}
                <div className="mt-10 flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-white/75">
                    Avaliação 5 estrelas pelos nossos clientes
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
