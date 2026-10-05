import { useMediaQuery } from './useMediaQuery'

/** Mouse de verdade (não toque) e sem "reduzir movimento": libera efeitos de hover. */
export function useFinePointer() {
  return useMediaQuery('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
}
