// Mesmo `cn` que os componentes do shadcn importam direto do pacote.
export { cn } from "cn"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export function formatPrice(value: number | null | undefined) {
  return brl.format(value ?? 0)
}
