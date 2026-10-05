import { useSyncExternalStore } from 'react'

/** Mouse de verdade (não toque) e sem "reduzir movimento": libera efeitos de hover. */
const QUERY = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useFinePointer() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
