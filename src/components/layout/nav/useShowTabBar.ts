import { useLocation } from 'react-router-dom'

/** Produto, sacola e checkout já têm barra de compra própria embaixo. */
export function useShowTabBar() {
  const { pathname } = useLocation()
  return !(/^\/produtos\/[^/]+/.test(pathname) || pathname.startsWith('/carrinho') || pathname.startsWith('/checkout'))
}
