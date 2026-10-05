import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'

import { IntroDoneContext, shouldPlayIntro } from '../../lib/intro'
import { cn } from '../../lib/utils'
import { useShowTabBar } from './nav/useShowTabBar'

import { Header } from './Header'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'
import { SiteIntro } from './SiteIntro'

/**
 * Rolagem entre páginas: links com #seção vão até ela (esperando a seção
 * existir, já que a home carrega dados); trocar de página começa do topo;
 * o "voltar" do navegador mantém a posição em que a pessoa estava.
 */
function ScrollManager() {
  const { pathname, hash, key } = useLocation()
  const navigationType = useNavigationType()
  const previousPath = useRef(pathname)

  useEffect(() => {
    const pathChanged = previousPath.current !== pathname
    previousPath.current = pathname

    if (hash) {
      let frame = 0
      let tries = 0
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const go = () => {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)))
        if (target) target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
        else if (tries++ < 60) frame = requestAnimationFrame(go)
      }
      go()
      return () => cancelAnimationFrame(frame)
    }

    if (pathChanged && navigationType !== 'POP') window.scrollTo({ top: 0 })
  }, [pathname, hash, key, navigationType])

  return null
}

export function Layout({ children }: { children?: React.ReactNode }) {
  const showTabBar = useShowTabBar()
  const [intro, setIntro] = useState<'playing' | 'revealing' | 'off'>(() => (shouldPlayIntro() ? 'playing' : 'off'))
  const revealIntro = useCallback(() => setIntro('revealing'), [])
  const endIntro = useCallback(() => setIntro('off'), [])

  return (
    <IntroDoneContext.Provider value={intro !== 'playing'}>
    <div
      className={cn(
        'relative flex min-h-screen flex-col bg-background text-foreground',
        // Espaço para a barra de atalhos do celular não cobrir o rodapé.
        showTabBar && 'max-lg:pb-[calc(4rem+env(safe-area-inset-bottom))]',
      )}
    >
      {/* Luz de estádio no topo; o resto do fundo é a tinta lisa. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60rem] bg-[radial-gradient(60rem_30rem_at_15%_-5%,rgb(255_194_26/0.10),transparent_70%),radial-gradient(50rem_30rem_at_90%_0%,rgb(59_139_234/0.10),transparent_70%)]"
      />
      <a
        href="#conteudo"
        className="sr-only z-[100] rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <ScrollManager />
      <Header />
      <main id="conteudo" tabIndex={-1} className="relative z-10 flex-1 outline-none">{children || <Outlet />}</main>
      <Footer />
      {/* Sacola global, na raiz para ficar por cima de tudo. */}
      <CartDrawer />
    </div>
    {intro !== 'off' && <SiteIntro onReveal={revealIntro} onDone={endIntro} />}
    </IntroDoneContext.Provider>
  )
}
