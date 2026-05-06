import { Header } from './Header'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'
import { CyberBackground } from '../ui/CyberBackground'
import { Outlet } from 'react-router-dom'

export function Layout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <CyberBackground />
      <Header />
      <main className="relative z-10 flex-1">{children || <Outlet />}</main>
      <Footer />
      {/* Global Cart Drawer (rendered at root so it overlays everything) */}
      <CartDrawer />
    </div>
  )
}
