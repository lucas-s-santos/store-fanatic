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

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaults)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('*')
      if (data) {
        const s: any = { ...defaults }
        data.forEach((row: any) => {
          const key = row.key as keyof SiteSettings
          if (key === 'shipping_free_threshold' || key === 'shipping_cost' || key === 'personalization_price') {
            s[key] = Number(row.value)
          } else {
            ;(s as any)[key] = row.value
          }
        })
        setSettings(s)
      }
      setLoading(false)
    }
    fetchSettings()
  }, [])

  return { settings, loading }
}
