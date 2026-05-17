import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, Loader2, Store, Truck, CreditCard, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Setting {
  key: string
  value: string
  description: string
}

const SETTING_GROUPS = [
  {
    title: 'Informações da Loja',
    icon: Store,
    keys: ['store_name'],
  },
  {
    title: 'WhatsApp',
    icon: MessageCircle,
    keys: ['whatsapp_number'],
  },
  {
    title: 'Frete',
    icon: Truck,
    keys: ['shipping_cost', 'shipping_free_threshold'],
  },
  {
    title: 'Pagamento',
    icon: CreditCard,
    keys: ['pix_key', 'personalization_price'],
  },
]

const KEY_LABELS: Record<string, string> = {
  store_name: 'Nome da Loja',
  whatsapp_number: 'Número WhatsApp (com DDI e DDD)',
  shipping_cost: 'Valor do Frete (R$)',
  shipping_free_threshold: 'Valor Mínimo para Frete Grátis (R$)',
  pix_key: 'Chave PIX',
  personalization_price: 'Preço da Personalização (R$)',
}

const KEY_PLACEHOLDERS: Record<string, string> = {
  store_name: 'Store Fanatic',
  whatsapp_number: '5511999999999',
  shipping_cost: '19.90',
  shipping_free_threshold: '299',
  pix_key: 'email@exemplo.com ou chave-aleatoria',
  personalization_price: '20',
}

const KEY_TYPE: Record<string, string> = {
  shipping_cost: 'number',
  shipping_free_threshold: 'number',
  personalization_price: 'number',
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data } = await supabase.from('site_settings').select('*')
    if (data) {
      const map: Record<string, string> = {}
      const descMap: Record<string, string> = {}
      data.forEach((s: Setting) => {
        map[s.key] = s.value
        descMap[s.key] = s.description
      })
      setSettings(map)
      setDescriptions(descMap)
    }
    setLoading(false)
  }

  const handleSave = async (key: string) => {
    setSaving(key)
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value: settings[key] || '', updated_at: new Date().toISOString() })

    if (error) {
      alert('Erro ao salvar: ' + error.message)
    } else {
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-10 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[1.5rem] px-6 py-6 sm:px-8"
      >
        <span className="chip border-primary/20 bg-primary/5 text-primary mb-3">
          <Settings className="h-4 w-4" />
          Configurações
        </span>
        <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white">
          Configurações da Loja
        </h1>
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-1">
          Gerencie as configurações globais do sistema
        </p>
      </motion.div>

      <div className="space-y-5">
        {SETTING_GROUPS.map((group, gi) => {
          const Icon = group.icon
          const groupKeys = group.keys.filter(k => k in settings || KEY_LABELS[k])

          return (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.07 }}
              className="glass-card rounded-[1.5rem] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white">
                  {group.title}
                </h2>
              </div>

              <div className="p-6 space-y-5">
                {groupKeys.map(key => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="form-label">{KEY_LABELS[key] || key}</label>
                      {descriptions[key] && (
                        <span className="text-[10px] text-muted-foreground">{descriptions[key]}</span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <input
                        type={KEY_TYPE[key] || 'text'}
                        step={KEY_TYPE[key] === 'number' ? '0.01' : undefined}
                        value={settings[key] || ''}
                        onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                        className="form-input flex-1"
                        placeholder={KEY_PLACEHOLDERS[key] || ''}
                      />
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving === key}
                        className={`flex items-center gap-2 px-5 rounded-xl font-sans text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
                          saved === key
                            ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30'
                            : 'btn-glow-primary'
                        }`}
                      >
                        {saving === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        {saved === key ? 'Salvo!' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}

        {/* Outras configurações não mapeadas */}
        {(() => {
          const mappedKeys = SETTING_GROUPS.flatMap(g => g.keys)
          const otherKeys = Object.keys(settings).filter(k => !mappedKeys.includes(k))
          if (otherKeys.length === 0) return null

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: SETTING_GROUPS.length * 0.07 }}
              className="glass-card rounded-[1.5rem] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white">
                  Outras Configurações
                </h2>
              </div>
              <div className="p-6 space-y-5">
                {otherKeys.map(key => (
                  <div key={key} className="space-y-2">
                    <label className="form-label">{KEY_LABELS[key] || key}</label>
                    <div className="flex gap-3">
                      <input
                        value={settings[key] || ''}
                        onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                        className="form-input flex-1"
                      />
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving === key}
                        className={`flex items-center gap-2 px-5 rounded-xl font-sans text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
                          saved === key
                            ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30'
                            : 'btn-glow-primary'
                        }`}
                      >
                        {saving === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {saved === key ? 'Salvo!' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })()}
      </div>
    </div>
  )
}
