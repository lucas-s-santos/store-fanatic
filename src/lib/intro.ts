import { createContext, useContext } from 'react'

/** Marca de "já viu a abertura" nesta aba: voltar para a home não repete. */
const SEEN_KEY = 'store-fanatic:intro-seen'

/**
 * A abertura só toca quando a pessoa entra pela home, uma vez por sessão.
 * Quem chega por link de produto ou de seção (WhatsApp, Instagram) vai direto
 * ao que veio ver, e quem pediu "reduzir movimento" não vê a animação.
 */
export function shouldPlayIntro() {
  if (window.location.pathname !== '/' || window.location.hash) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return !sessionStorage.getItem(SEEN_KEY)
  } catch {
    return true
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Sem storage (aba anônima com bloqueio): a abertura volta a tocar, tudo bem.
  }
}

/** false enquanto a abertura cobre a tela; a home espera para animar o hero. */
export const IntroDoneContext = createContext(true)

export function useIntroDone() {
  return useContext(IntroDoneContext)
}
