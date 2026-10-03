import { Outlet } from 'react-router-dom'

import { Header } from './Header'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'

export function Layout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
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
      <Header />
      <main id="conteudo" tabIndex={-1} className="relative z-10 flex-1 outline-none">{children || <Outlet />}</main>
      <Footer />
      {/* Sacola global, na raiz para ficar por cima de tudo. */}
      <CartDrawer />
    </div>
  )
}
