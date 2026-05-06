import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] bg-background/50 px-4 pt-14 pb-8 sm:px-6">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg">
                <img src="/store%20fanatic.jpg" alt="Store Fanatic" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="font-display text-lg font-bold uppercase tracking-wide text-white">Store Fanatic</p>
                <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-primary/60">Matchday Store</p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-7 text-white/40">
              Camisetas oficiais dos maiores times. Compre direto pelo WhatsApp
              com atendimento rápido e entrega para todo o Brasil.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/60 mb-5">
              Navegação
            </p>
            <div className="flex flex-col gap-3 text-sm text-white/40">
              <Link to="/" className="transition-colors hover:text-white w-fit">Home</Link>
              <Link to="/produtos" className="transition-colors hover:text-white w-fit">Catálogo</Link>
              <Link to="/carrinho" className="transition-colors hover:text-white w-fit">Carrinho</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/60 mb-5">
              Contato
            </p>
            <div className="flex flex-col gap-3 text-sm text-white/40">
              <a
                href="https://wa.me/5535988862172"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 transition-colors hover:text-[#25D366] w-fit"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.38 1.26 4.8L2.05 22l5.43-1.43c1.38.75 2.95 1.17 4.56 1.17 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.16c-1.47 0-2.91-.4-4.16-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.18 8.18 0 0 1-1.25-4.38C3.84 7.41 7.5 3.75 12.04 3.75c4.54 0 8.2 3.66 8.2 8.16 0 4.5-3.66 8.25-8.2 8.25zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.22-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-.12-.78.66-1.24 1.47-1.38 1.72-.14.24-.01.37.1.49.11.11.25.29.37.43.12.14.16.24.24.41.08.16.04.3-.02.43-.06.12-.56 1.34-.76 1.83-.2.49-.4.42-.56.43l-.48.01c-.16 0-.43-.06-.65-.31-.22-.25-.85-.83-.85-2.03 0-1.2.87-2.35 1-2.52.12-.16 1.7-2.6 4.12-3.64.58-.25 1.02-.39 1.37-.5.58-.18 1.1-.16 1.52-.1.46.07 1.42.58 1.62 1.14.2.56.2 1.04.14 1.14-.06.1-.22.16-.47.28z"/>
                </svg>
                WhatsApp
              </a>
              <span>Atendimento rápido e direto</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Store Fanatic. Todos os direitos reservados.</span>
          <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.2em]">Premium Matchday Store</span>
        </div>
      </div>
    </footer>
  )
}
