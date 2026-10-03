import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, QrCode, Shirt, Star, Truck, Users } from 'lucide-react'

import { JerseyRack, type RackItem } from '../components/home/JerseyRack'
import { ProductShelf } from '../components/home/ProductShelf'
import { SectionHeading } from '../components/home/SectionHeading'
import { JerseyPreview } from '../components/product/JerseyPreview'
import { Button } from '../components/ui/button'
import { Marquee } from '../components/ui/marquee'
import { WhatsAppIcon, whatsappUrl } from '../components/ui/whatsapp-icon'
import { optimizedImageUrl } from '../lib/assets'
import {
  fetchLeaguesAndTeams,
  fetchShowcaseProducts,
  displayProductName,
  productName,
  shuffle,
  type ShowcaseLeague,
  type ShowcaseProduct,
  type ShowcaseTeam,
} from '../lib/catalog'
import { supabase } from '../lib/supabase'
import { useSettings } from '../lib/useSettings'
import { formatPrice } from '../lib/utils'

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

const EASE = [0.16, 1, 0.3, 1] as const
const RACK_SIZE = 16
const SHELF_SIZE = 12

/** Entra subindo de leve quando chega na tela. */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Um produto por time, em ordem aleatória: vitrine variada em vez de 12 camisas do mesmo clube. */
function onePerTeam(products: ShowcaseProduct[]) {
  const byTeam = new Map<string, ShowcaseProduct[]>()
  for (const product of products) {
    if (!product.image_url) continue
    const key = `${product.league}:${product.team}`
    byTeam.set(key, [...(byTeam.get(key) ?? []), product])
  }
  return shuffle([...byTeam.values()].map((group) => group[Math.floor(Math.random() * group.length)]))
}

/**
 * Monta a vitrine uma vez por visita (é aleatória de propósito: a arara e as
 * prateleiras mudam a cada carregamento). Roda no efeito, fora da renderização.
 */
function buildShowcase(products: ShowcaseProduct[], leagues: ShowcaseLeague[], teams: ShowcaseTeam[]) {
  const teamNames = new Map(teams.map((team) => [`${team.league_id}:${team.id}`, team.name] as const))

  const rack: RackItem[] = onePerTeam(products)
    .slice(0, RACK_SIZE)
    .map((product) => ({
      id: product.id,
      name: displayProductName(productName(product)),
      caption: teamNames.get(`${product.league}:${product.team}`) ?? displayProductName(productName(product)),
      image: product.image_url,
      price: product.price,
    }))

  const tiles = leagues
    .map((league) => {
      const items = products.filter((p) => p.league === league.id && p.image_url)
      const cover = items.find((p) => p.featured) ?? items[Math.floor(Math.random() * items.length)]
      return { ...league, count: items.length, cover: cover?.image_url }
    })
    .filter((tile) => tile.count > 0)
    .sort((a, b) => b.count - a.count)

  const selecoes = products.filter((p) => p.league === 'selecoes')

  return {
    rack,
    tiles,
    selecoes: [...selecoes.filter((p) => p.featured), ...onePerTeam(selecoes.filter((p) => !p.featured))].slice(0, SHELF_SIZE),
    brasileirao: onePerTeam(products.filter((p) => p.league === 'brasileirao')).slice(0, SHELF_SIZE),
    europe: onePerTeam(products.filter((p) => p.league !== 'brasileirao' && p.league !== 'selecoes')).slice(0, SHELF_SIZE),
    productCount: products.length,
  }
}

const EMPTY_SHOWCASE: ReturnType<typeof buildShowcase> = {
  rack: [],
  tiles: [],
  selecoes: [],
  brasileirao: [],
  europe: [],
  productCount: 0,
}

export function HomePage() {
  const { settings } = useSettings()
  const [view, setView] = useState(EMPTY_SHOWCASE)
  const [leagues, setLeagues] = useState<ShowcaseLeague[]>([])
  const [loading, setLoading] = useState(true)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [stats, setStats] = useState<SiteStat[]>([])
  const [jerseyName, setJerseyName] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')

  useEffect(() => {
    let active = true

    Promise.allSettled([
      fetchShowcaseProducts(),
      fetchLeaguesAndTeams(),
      supabase.from('testimonials').select('*').eq('active', true).order('order_priority', { ascending: true }),
      supabase.from('site_stats').select('*').order('order_priority', { ascending: true }),
    ]).then(([productsRes, leaguesRes, testimonialsRes, statsRes]) => {
      if (!active) return
      const products = productsRes.status === 'fulfilled' ? productsRes.value : []
      const { leagues, teams } = leaguesRes.status === 'fulfilled' ? leaguesRes.value : { leagues: [], teams: [] }
      setLeagues(leagues)
      setView(buildShowcase(products, leagues, teams))
      if (testimonialsRes.status === 'fulfilled' && testimonialsRes.value.data) {
        setTestimonials(testimonialsRes.value.data as Testimonial[])
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setStats(statsRes.value.data as SiteStat[])
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const modelCount = view.productCount >= 20 ? Math.floor(view.productCount / 10) * 10 : 0
  const visibleStats = stats.filter((stat) => stat.value > 0)
  const leagueNames = leagues.length > 0 ? leagues.map((l) => l.name) : ['Clubes', 'Seleções', 'Personalizadas']

  return (
    <div>
      {/* ── Hero: arara de camisas ── */}
      <section className="relative isolate overflow-hidden pt-[7.5rem] lg:pt-[8.5rem]">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[58%] h-[34rem] w-[80rem] max-w-[160vw] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-[120px]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-end gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="eyebrow"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Temporada 2026 · Clubes e seleções
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
                className="display-title mt-4 text-[3.35rem] leading-[0.88] sm:text-7xl lg:text-[6.5rem] xl:text-[7.75rem]"
              >
                Vista a paixão
                <span className="block text-highlight">do seu time.</span>
              </motion.h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="lg:pb-2"
            >
              <p className="max-w-md text-base leading-7 text-foreground/80">
                {modelCount > 0 ? `Mais de ${modelCount} modelos` : 'Camisas'} de clubes brasileiros, ligas europeias e seleções.
                Escolha o tamanho, coloque nome e número e receba em casa.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3">
                <Button asChild size="xl" className="group max-sm:h-12 max-sm:px-5 max-sm:text-[13px] max-sm:tracking-[0.05em] max-sm:[&_svg]:hidden">
                  <Link to="/produtos">
                    Comprar camisas
                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="xl" variant="outline" className="max-sm:h-12 max-sm:px-4 max-sm:text-[13px] max-sm:tracking-[0.05em]">
                  <a href="#personalize">Personalizar</a>
                </Button>
              </div>

              <ul className="mt-6 hidden flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground sm:flex">
                <li className="inline-flex items-center gap-2">
                  <QrCode className="size-4 text-primary" aria-hidden />
                  Pagamento via PIX
                </li>
                <li className="inline-flex items-center gap-2">
                  <Truck className="size-4 text-primary" aria-hidden />
                  Frete grátis acima de {formatPrice(settings.shipping_free_threshold)}
                </li>
              </ul>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="relative mt-10 pb-10 lg:mt-14"
        >
          <JerseyRack items={view.rack} loading={loading} backdropWords={leagueNames} />
        </motion.div>
      </section>

      {/* ── Compre por liga ── */}
      {(loading || view.tiles.length > 0) && (
        <section className="section-shell">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow="Compre por liga"
                title={
                  <>
                    Escolha o <span className="text-highlight">seu campeonato</span>
                  </>
                }
                action={
                  <Button asChild variant="outline" className="font-bold">
                    <Link to="/produtos">
                      Todas as camisas
                      <ArrowRight />
                    </Link>
                  </Button>
                }
              />
            </Reveal>
          </div>

          <div className="shelf mx-auto max-w-[1440px] auto-cols-[70%] gap-3 scroll-px-4 px-4 sm:auto-cols-[40%] sm:gap-5 sm:scroll-px-6 sm:px-6 lg:auto-cols-[calc((100%-3*1.25rem)/4.2)] lg:scroll-px-8 lg:px-8">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted" />)
              : view.tiles.map((tile) => (
                  <Link
                    key={tile.id}
                    to={`/produtos?liga=${tile.id}`}
                    className="group relative block aspect-[3/4] overflow-hidden rounded-3xl bg-muted ring-1 ring-inset ring-white/[0.06]"
                  >
                    {tile.cover && (
                      <img
                        src={optimizedImageUrl(tile.cover, 640)}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.06]"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />

                    <span className="absolute left-4 top-4 flex size-14 items-center justify-center rounded-2xl bg-paper p-2 shadow-lg">
                      {tile.logo_url && (
                        <img src={optimizedImageUrl(tile.logo_url, 120)} alt="" loading="lazy" className="size-full object-contain" />
                      )}
                    </span>

                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/75">
                        {tile.country ? `${tile.country} · ` : ''}
                        {tile.count} camisas
                      </p>
                      <h3 className="display-title mt-1.5 text-4xl lg:text-[2.6rem]">{tile.name}</h3>
                      <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-paper-foreground transition-colors group-hover:bg-primary">
                        Ver coleção
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                ))}
          </div>
        </section>
      )}

      <ProductShelf
        eyebrow="Copa do Mundo 2026"
        title={
          <>
            Rumo à <span className="text-highlight">Copa</span>
          </>
        }
        description="As camisas das seleções que vão entrar em campo no próximo Mundial."
        href="/produtos?liga=selecoes"
        products={view.selecoes}
        loading={loading}
      />

      {/* ── Personalização ── */}
      <section id="personalize" className="section-shell scroll-mt-24">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-paper text-paper-foreground [&_:focus-visible]:outline-paper-foreground">
              <span
                aria-hidden
                className="display-title pointer-events-none absolute -right-6 -top-10 select-none text-[18rem] leading-none text-paper-foreground/[0.04] sm:text-[24rem]"
              >
                {jerseyNumber || '10'}
              </span>

              <div className="relative grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_0.85fr] lg:p-16">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em]">
                    <Shirt className="size-4 text-flame" aria-hidden />
                    Personalização
                  </p>
                  <h2 className="display-title mt-4 text-[3.25rem] leading-[1.02] sm:text-7xl lg:text-[5.5rem]">
                    Seu nome.
                    <br />
                    Seu número.
                    <br />
                    <span className="mt-2 inline-block bg-primary px-3 pt-1 leading-[1.05]">Sua camisa.</span>
                  </h2>
                  <p className="mt-6 max-w-md text-base leading-7 text-paper-foreground/75">
                    Coloque nas costas o nome e o número que quiser por + {formatPrice(settings.personalization_price)}. Teste aqui como fica:
                  </p>

                  <div className="mt-6 grid max-w-md grid-cols-[1fr_6.5rem] gap-3">
                    <label className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-paper-foreground/70">Nome</span>
                      <input
                        value={jerseyName}
                        onChange={(e) => setJerseyName(e.target.value.toUpperCase().slice(0, 12))}
                        placeholder="SEU NOME"
                        className="h-12 w-full rounded-xl border-2 border-paper-foreground/15 bg-white px-4 font-bold uppercase tracking-wide text-paper-foreground placeholder:text-paper-foreground/60 focus:border-paper-foreground focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-paper-foreground/70">Número</span>
                      <input
                        value={jerseyNumber}
                        onChange={(e) => setJerseyNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        inputMode="numeric"
                        placeholder="10"
                        className="h-12 w-full rounded-xl border-2 border-paper-foreground/15 bg-white px-4 text-center font-bold text-paper-foreground placeholder:text-paper-foreground/60 focus:border-paper-foreground focus:outline-none"
                      />
                    </label>
                  </div>

                  <Button asChild size="xl" className="group mt-8 bg-paper-foreground text-paper hover:bg-black hover:shadow-none">
                    <Link to="/produtos">
                      Escolher minha camisa
                      <ArrowRight className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>

                <div className="relative mx-auto w-full max-w-[400px]">
                  <div aria-hidden className="absolute inset-[12%] rounded-full bg-primary/50 blur-[70px]" />
                  <div className="relative origin-[50%_0] motion-safe:animate-sway [--sway-duration:6s]">
                    <JerseyPreview name={jerseyName} number={jerseyNumber} className="drop-shadow-[0_30px_30px_rgb(11_14_21/0.25)]" />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <ProductShelf
        eyebrow="Brasileirão"
        title={
          <>
            Os mantos do <span className="text-highlight">Brasil</span>
          </>
        }
        href="/produtos?liga=brasileirao"
        products={view.brasileirao}
        loading={loading}
      />

      <ProductShelf
        eyebrow="Ligas europeias"
        title={
          <>
            Gigantes da <span className="text-highlight">Europa</span>
          </>
        }
        description="Premier League, La Liga, Serie A, Bundesliga e Ligue 1."
        href="/produtos"
        products={view.europe}
        loading={loading}
      />

      {/* ── Depoimentos e números (só aparecem com dados reais) ── */}
      {(testimonials.length > 0 || visibleStats.length >= 2) && (
        <section className="section-shell">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow="Quem comprou"
                title={
                  <>
                    Torcida <span className="text-highlight">aprovada</span>
                  </>
                }
              />
            </Reveal>

            {visibleStats.length >= 2 && (
              <Reveal className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border lg:grid-cols-4">
                {visibleStats.map((stat) => (
                  <div key={stat.id} className="bg-card px-6 py-8">
                    <p className="display-title text-5xl text-primary lg:text-6xl">
                      {stat.value}
                      {stat.suffix}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </Reveal>
            )}

            {testimonials.length > 0 && (
              <div className="shelf auto-cols-[85%] gap-4 sm:auto-cols-[45%] lg:auto-cols-[calc((100%-2*1rem)/3)]">
                {testimonials.map((t) => (
                  <figure key={t.id} className="flex flex-col rounded-3xl border border-border bg-card p-6 sm:p-8">
                    <div className="flex gap-1" aria-label={`${t.rating} de 5 estrelas`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={i < t.rating ? 'size-4 fill-primary text-primary' : 'size-4 text-white/15'} aria-hidden />
                      ))}
                    </div>
                    <blockquote className="mt-5 flex-1 text-base leading-7 text-foreground/85">“{t.text}”</blockquote>
                    <figcaption className="mt-6 flex items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                        {t.avatar_url ? (
                          <img src={optimizedImageUrl(t.avatar_url, 96)} alt="" className="size-full object-cover" loading="lazy" />
                        ) : (
                          <Users className="size-5 text-primary" aria-hidden />
                        )}
                      </span>
                      <span>
                        <span className="block font-bold">{t.name}</span>
                        <span className="block text-xs text-muted-foreground">Cliente verificado</span>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── CTA final ── */}
      <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-[1440px]">
          <div className="relative overflow-hidden rounded-[2rem] bg-primary text-primary-foreground [&_:focus-visible]:outline-primary-foreground">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-6 opacity-[0.06]">
              <Marquee duration={60} pauseOnHover={false} itemsClassName="gap-8 pr-8">
                <span className="display-title whitespace-nowrap text-[9rem] leading-none sm:text-[12rem]">Bora pro jogo ✦ Bora pro jogo ✦</span>
              </Marquee>
            </div>

            <div className="relative grid gap-8 p-7 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-end lg:p-16">
              <div>
                <h2 className="display-title text-[3.25rem] sm:text-7xl lg:text-[5.5rem]">
                  Ficou na dúvida
                  <br />
                  do tamanho?
                </h2>
                <p className="mt-4 max-w-lg text-base font-medium leading-7 text-primary-foreground/80">
                  A gente te ajuda pelo WhatsApp com tamanho, prazo de entrega e personalização.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {settings.whatsapp_number && (
                  <Button asChild size="xl" className="bg-primary-foreground text-primary hover:bg-black hover:shadow-none">
                    <a href={whatsappUrl(settings.whatsapp_number, 'Olá! Quero ajuda para escolher minha camisa.')} target="_blank" rel="noopener noreferrer">
                      <WhatsAppIcon />
                      Chamar no WhatsApp
                    </a>
                  </Button>
                )}
                <Button
                  asChild
                  size="xl"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:border-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Link to="/produtos">Ver catálogo</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
