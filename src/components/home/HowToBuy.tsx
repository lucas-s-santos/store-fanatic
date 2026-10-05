import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, QrCode, Ruler, Shirt, Truck, type LucideIcon } from 'lucide-react'

import { JerseyPreview } from '@/components/product/JerseyPreview'
import { Button } from '@/components/ui/button'
import { WhatsAppIcon, whatsappUrl } from '@/components/ui/whatsapp-icon'
import { cn, formatPrice } from '@/lib/utils'
import { SectionHeading } from './SectionHeading'

interface Step {
  title: string
  text: string
  icon: LucideIcon
  /** Classes de fundo + texto do cartão. */
  tone: string
  visual?: ReactNode
}

function buildSteps(personalizationPrice: number): Step[] {
  return [
    {
      title: 'Escolha a camisa',
      text: 'Filtre por liga ou time, veja as fotos e confira o guia de medidas antes de escolher o tamanho.',
      icon: Ruler,
      tone: 'bg-card text-foreground border border-border',
    },
    {
      title: 'Personalize se quiser',
      text: `Coloque o nome e o número que quiser nas costas por + ${formatPrice(personalizationPrice)}.`,
      icon: Shirt,
      tone: 'bg-paper text-paper-foreground',
      visual: <JerseyPreview name="SEU NOME" number="10" className="w-32 drop-shadow-[0_16px_20px_rgb(11_14_21/0.2)] sm:w-40" />,
    },
    {
      title: 'Pague no PIX',
      text: 'Entre na sua conta, confirme o pedido e receba a chave PIX com QR Code. Depois é só mandar o comprovante no WhatsApp.',
      icon: QrCode,
      tone: 'bg-primary text-primary-foreground',
    },
    {
      title: 'Receba em casa',
      text: 'Com o pagamento confirmado, preparamos o envio para todo o Brasil. Acompanhe cada etapa em “Meus pedidos”.',
      icon: Truck,
      tone: 'bg-[color-mix(in_oklch,var(--pitch),black_38%)] text-white',
    },
  ]
}

function StepCard({ step, index, total }: { step: Step; index: number; total: number }) {
  // Marcador invisível na posição "natural" do cartão: medir o próprio <li>
  // sticky não funciona, porque a posição dele muda enquanto está grudado.
  const markerRef = useRef<HTMLSpanElement>(null)
  // 0 quando este cartão gruda no topo, 1 quando o próximo terminou de subir.
  const { scrollYProgress } = useScroll({ target: markerRef, offset: ['start start', 'end start'] })
  const isLast = index === total - 1
  // O próximo cartão só começa a cobrir este perto de 35% do percurso.
  const covering = [0.35, 1]
  const scale = useTransform(scrollYProgress, covering, [1, isLast ? 1 : 0.94])
  // transform em string: o Motion aplica sem passar pelo layout (acelerado pela GPU).
  const transform = useMotionTemplate`scale(${scale})`
  // Escurece com uma camada por cima: o cartão continua opaco, sem "fantasma" do de trás.
  const shade = useTransform(scrollYProgress, covering, [0, isLast ? 0 : 0.5])

  return (
    <>
      <span
        ref={markerRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0"
        style={{ top: `calc(${index} * var(--step-h))`, height: 'var(--step-h)' }}
      />
      {/* O <li> é o sticky: todos são irmãos na mesma lista alta, então cada um
          gruda no topo enquanto o próximo sobe por cima. */}
      <li
        className="sticky top-0 flex h-[var(--step-h)] items-start"
        style={{ paddingTop: `calc(6.5rem + ${index * 1.25}rem)` }}
      >
        <motion.article
          style={{ transform, transformOrigin: 'top center' }}
          className={cn('relative w-full overflow-hidden rounded-[2rem] p-6 shadow-[0_-20px_50px_-30px_rgb(0_0_0/0.9)] sm:p-9', step.tone)}
        >
          <StepContent step={step} index={index} />
          <motion.span aria-hidden style={{ opacity: shade }} className="pointer-events-none absolute inset-0 bg-background" />
        </motion.article>
      </li>
    </>
  )
}

function StepContent({ step, index }: { step: Step; index: number }) {
  return (
    <div className="flex min-h-[15rem] flex-col justify-between gap-6 sm:min-h-[17rem] sm:flex-row sm:items-end">
      <div className="max-w-md">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-current/10">
          <step.icon className="size-6" aria-hidden />
        </span>
        <h3 className="display-title mt-6 text-4xl sm:text-5xl">{step.title}</h3>
        <p className="mt-3 text-base leading-7 opacity-80">{step.text}</p>
      </div>
      <div className="flex items-end justify-between gap-4 sm:flex-col sm:items-end">
        {step.visual}
        <span aria-hidden className="display-title text-7xl leading-none opacity-20 sm:text-8xl">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

/**
 * "Como comprar": o fluxo PIX + WhatsApp é diferente do checkout comum, então
 * vale mostrar antes. Cartões empilham ao rolar (técnica do Skiper UI #16 /
 * ScrollStack do React Bits) só com sticky + scroll do Motion, sem Lenis.
 */
export function HowToBuy({ personalizationPrice, whatsappNumber }: { personalizationPrice: number; whatsappNumber: string }) {
  const reduce = useReducedMotion() ?? false
  const steps = buildSteps(personalizationPrice)

  return (
    <section id="como-comprar" className="section-shell scroll-mt-20" aria-labelledby="como-comprar-titulo">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            className="mb-0"
            eyebrow="Como comprar"
            title={
              <span id="como-comprar-titulo">
                Simples
                <br />
                como um <span className="text-highlight">gol</span>
              </span>
            }
            description="Você escolhe, paga no PIX e fala direto com a gente pelo WhatsApp. Em quatro passos:"
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/produtos">
                Ver camisas
                <ArrowRight />
              </Link>
            </Button>
            {whatsappNumber && (
              <Button asChild size="lg" variant="outline">
                <a href={whatsappUrl(whatsappNumber, 'Olá! Tenho uma dúvida sobre como comprar.')} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-4 text-success" />
                  Tirar dúvida
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
        {reduce ? (
          // Sem movimento: os mesmos cartões, só empilhados na página.
          <ol className="grid gap-4">
            {steps.map((step, index) => (
              <li key={step.title} className={cn('rounded-[2rem] p-6 sm:p-9', step.tone)}>
                <StepContent step={step} index={index} />
              </li>
            ))}
          </ol>
        ) : (
          <ol className="relative [--step-h:62vh] sm:[--step-h:58vh]">
            {steps.map((step, index) => (
              <StepCard key={step.title} step={step} index={index} total={steps.length} />
            ))}
          </ol>
        )}
        </div>
      </div>
    </section>
  )
}
