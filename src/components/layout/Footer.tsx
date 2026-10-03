import { Link } from 'react-router-dom'
import { Flame, QrCode, Shirt, Truck } from 'lucide-react'

import { Button } from '../ui/button'
import { WhatsAppIcon, whatsappUrl } from '../ui/whatsapp-icon'
import { useSettings } from '../../lib/useSettings'
import { formatPrice } from '../../lib/utils'

const SHOP_LINKS = [
  { label: 'Todas as camisas', to: '/produtos' },
  { label: 'Seleções', to: '/produtos?liga=selecoes' },
  { label: 'Brasileirão', to: '/produtos?liga=brasileirao' },
  { label: 'Premier League', to: '/produtos?liga=premier-league' },
  { label: 'La Liga', to: '/produtos?liga=laliga' },
]

const ACCOUNT_LINKS = [
  { label: 'Entrar ou criar conta', to: '/login' },
  { label: 'Meus pedidos', to: '/meus-pedidos' },
  { label: 'Sacola', to: '/carrinho' },
]

export function Footer() {
  const { settings } = useSettings()

  const perks = [
    { icon: Truck, label: `Frete grátis acima de ${formatPrice(settings.shipping_free_threshold)}` },
    { icon: QrCode, label: 'Pagamento via PIX' },
    { icon: Shirt, label: 'Personalização com nome e número' },
  ]

  return (
    <footer className="relative z-10 mt-8 overflow-hidden border-t border-border bg-[#070a10]">
      <div className="border-b border-border">
        <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-8">
          {perks.map((perk) => (
            <div key={perk.label} className="flex items-center gap-3 text-sm font-semibold text-foreground/90">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <perk.icon className="size-5" aria-hidden />
              </span>
              {perk.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.9fr]">
          <div className="max-w-sm space-y-5">
            <Link to="/" className="flex items-center gap-3">
              <img src="/store-fanatic.jpg" alt="" className="size-12 rounded-xl border border-white/10 object-cover" />
              <span className="display-title text-3xl">
                Store <span className="text-primary">Fanatic</span>
              </span>
            </Link>
            <p className="text-sm leading-7 text-muted-foreground">
              Camisas de clubes e seleções para quem vive futebol. Compra simples, pagamento via PIX e envio para todo o Brasil.
            </p>
          </div>

          <nav aria-label="Comprar">
            <p className="eyebrow">Comprar</p>
            <ul className="mt-5 space-y-3 text-sm">
              {SHOP_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Minha conta">
            <p className="eyebrow">Minha conta</p>
            <ul className="mt-5 space-y-3 text-sm">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow">Atendimento</p>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Dúvida sobre tamanho, prazo ou personalização? Fale com a gente.
            </p>
            {settings.whatsapp_number && (
              <Button asChild variant="success" className="mt-4 font-bold">
                <a href={whatsappUrl(settings.whatsapp_number)} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-4" />
                  Chamar no WhatsApp
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            &copy; {new Date().getFullYear()} {settings.store_name}. Todos os direitos reservados.
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em]">
            <Flame className="size-3.5 text-flame" aria-hidden />
            Feito para quem vive futebol
          </span>
        </div>
      </div>

      {/* Letreiro gigante, cortado pela borda de baixo. */}
      <p
        aria-hidden
        className="display-title pointer-events-none -mb-[0.2em] select-none whitespace-nowrap text-center text-[18vw] leading-[0.8] text-outline"
      >
        Store Fanatic
      </p>
    </footer>
  )
}
