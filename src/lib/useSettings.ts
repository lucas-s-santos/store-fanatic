import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { DEFAULT_WHATSAPP, DEFAULT_SHIPPING_FREE_THRESHOLD, DEFAULT_SHIPPING_COST, DEFAULT_PERSONALIZATION_PRICE } from './constants'

interface SiteSettings {
  whatsapp_number: string
  shipping_free_threshold: number
  shipping_cost: number
  personalization_price: number
  pix_key: string
  store_name: string
}

const defaults: SiteSettings = {
  whatsapp_number: DEFAULT_WHATSAPP,
  shipping_free_threshold: DEFAULT_SHIPPING_FREE_THRESHOLD,
  shipping_cost: DEFAULT_SHIPPING_COST,
  personalization_price: DEFAULT_PERSONALIZATION_PRICE,
  pix_key: '',
  store_name: 'Store Fanatic',
}

// Cabeçalho, rodapé, carrinho e páginas usam as configurações ao mesmo tempo:
// uma busca só por carregamento de página, compartilhada entre todos.
let cached: SiteSettings | null = null
let request: Promise<SiteSettings> | null = null

async function loadSettings() {
  const { data } = await supabase.from('site_settings').select('*')
  const s: any = { ...defaults }
  data?.forEach((row: any) => {
    const key = row.key as keyof SiteSettings
    if (key === 'shipping_free_threshold' || key === 'shipping_cost' || key === 'personalization_price') {
      s[key] = Number(row.value)
    } else {
      ;(s as any)[key] = row.value
    }
  })
  cached = s
  return s as SiteSettings
}

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>(cached ?? defaults)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) return
    let active = true
    request ??= loadSettings().catch(() => {
      request = null
      return defaults
    })
    request.then((s) => {
      if (!active) return
      setSettings(s)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  return { settings, loading }
}

/** Remove o cache para que a próxima montagem busque de novo (após salvar no admin). */
export function invalidateSettings() {
  cached = null
  request = null
}
