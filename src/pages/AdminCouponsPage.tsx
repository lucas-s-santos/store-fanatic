import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Tag, Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Coupon {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value: number
  max_uses: number
  used_count: number
  active: boolean
  expires_at: string | null
  created_at: string
}

const empty: Partial<Coupon> = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_value: 0,
  max_uses: 0,
  active: true,
  expires_at: null,
}

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<Partial<Coupon>>(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    setLoading(true)
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons(data || [])
    setLoading(false)
  }

  const openNew = () => {
    setForm({ ...empty })
    setIsEditing(true)
  }

  const openEdit = (coupon: Coupon) => {
    setForm({
      ...coupon,
      expires_at: coupon.expires_at
        ? new Date(coupon.expires_at).toISOString().slice(0, 16)
        : null,
    })
    setIsEditing(true)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      code: (form.code || '').toUpperCase().trim(),
      description: form.description || '',
      discount_type: form.discount_type || 'percentage',
      discount_value: Number(form.discount_value) || 0,
      min_order_value: Number(form.min_order_value) || 0,
      max_uses: Number(form.max_uses) || 0,
      active: form.active !== false,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }

    if (form.id) {
      const { error } = await supabase.from('coupons').update(payload).eq('id', form.id)
      if (error) alert('Erro ao atualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('coupons').insert([payload])
      if (error) alert('Erro ao criar: ' + error.message)
    }

    setSaving(false)
    setIsEditing(false)
    fetchCoupons()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este cupom?')) return
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) alert('Erro: ' + error.message)
    else fetchCoupons()
  }

  const handleToggleActive = async (coupon: Coupon) => {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id)
    fetchCoupons()
  }

  const formatDiscount = (c: Coupon) =>
    c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2).replace('.', ',')}`

  return (
    <div className="p-6 sm:p-10 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[1.5rem] px-6 py-6 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <span className="chip border-primary/20 bg-primary/5 text-primary mb-3">
            <Tag className="h-4 w-4" />
            Cupons de Desconto
          </span>
          <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white">Gerenciar Cupons</h1>
        </div>
        <button onClick={openNew} className="btn-glow-primary flex items-center gap-2 shrink-0">
          <Plus className="h-5 w-5" />
          Novo Cupom
        </button>
      </motion.div>

      {/* Form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <form onSubmit={handleSave} className="glass-card rounded-[1.5rem] p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-xl font-display font-bold uppercase text-white">
                  {form.id ? 'Editar Cupom' : 'Novo Cupom'}
                </h2>
                <button type="button" onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Código */}
                <div className="space-y-2">
                  <label className="form-label">Código do Cupom</label>
                  <input
                    required
                    value={form.code || ''}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="form-input font-mono uppercase tracking-widest"
                    placeholder="EX: DESCONTO10"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <label className="form-label">Descrição</label>
                  <input
                    value={form.description || ''}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="form-input"
                    placeholder="Ex: 10% de desconto na primeira compra"
                  />
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <label className="form-label">Tipo de Desconto</label>
                  <select
                    value={form.discount_type || 'percentage'}
                    onChange={e => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="form-input appearance-none"
                  >
                    <option value="percentage">Percentual (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>

                {/* Valor */}
                <div className="space-y-2">
                  <label className="form-label">
                    {form.discount_type === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'}
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    max={form.discount_type === 'percentage' ? 100 : undefined}
                    value={form.discount_value || ''}
                    onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                    className="form-input"
                    placeholder={form.discount_type === 'percentage' ? '10' : '20.00'}
                  />
                </div>

                {/* Mínimo de pedido */}
                <div className="space-y-2">
                  <label className="form-label">Valor Mínimo do Pedido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_order_value || ''}
                    onChange={e => setForm({ ...form, min_order_value: Number(e.target.value) })}
                    className="form-input"
                    placeholder="0.00 (sem mínimo)"
                  />
                </div>

                {/* Máximo de usos */}
                <div className="space-y-2">
                  <label className="form-label">Limite de Usos (0 = ilimitado)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.max_uses ?? ''}
                    onChange={e => setForm({ ...form, max_uses: Number(e.target.value) })}
                    className="form-input"
                    placeholder="0"
                  />
                </div>

                {/* Validade */}
                <div className="space-y-2 sm:col-span-2">
                  <label className="form-label">Data de Validade (opcional)</label>
                  <input
                    type="datetime-local"
                    value={form.expires_at || ''}
                    onChange={e => setForm({ ...form, expires_at: e.target.value || null })}
                    className="form-input"
                  />
                </div>

                {/* Ativo */}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className={`w-full flex items-center gap-3 p-4 border rounded-xl transition-colors ${
                      form.active !== false
                        ? 'border-[#25D366]/30 bg-[#25D366]/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Tag className={`h-5 w-5 ${form.active !== false ? 'text-[#25D366]' : 'text-muted-foreground'}`} />
                    <div className="text-left">
                      <p className="font-display font-bold uppercase text-sm text-white">Cupom Ativo</p>
                      <p className="text-[10px] text-muted-foreground">Disponível para uso pelos clientes</p>
                    </div>
                    {form.active !== false
                      ? <ToggleRight className="h-5 w-5 text-[#25D366] ml-auto" />
                      : <ToggleLeft className="h-5 w-5 text-muted-foreground ml-auto" />
                    }
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setIsEditing(false)} className="btn-outline px-6">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-glow-primary px-8 flex items-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Cupom
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="glass-card rounded-[1.5rem] overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum cupom cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="p-4">Código</th>
                  <th className="p-4">Desconto</th>
                  <th className="p-4">Mín. Pedido</th>
                  <th className="p-4">Usos</th>
                  <th className="p-4">Validade</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {coupons.map(coupon => (
                  <tr key={coupon.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-bold text-white tracking-widest">{coupon.code}</span>
                      {coupon.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{coupon.description}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-primary/10 text-primary font-bold text-xs">
                        {formatDiscount(coupon)}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      {coupon.min_order_value > 0
                        ? `R$ ${Number(coupon.min_order_value).toFixed(2).replace('.', ',')}`
                        : <span className="text-muted-foreground">Sem mínimo</span>
                      }
                    </td>
                    <td className="p-4 text-xs">
                      {coupon.used_count}/{coupon.max_uses === 0 ? '∞' : coupon.max_uses}
                    </td>
                    <td className="p-4 text-xs">
                      {coupon.expires_at
                        ? new Date(coupon.expires_at).toLocaleDateString('pt-BR')
                        : <span className="text-muted-foreground">Sem validade</span>
                      }
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          coupon.active
                            ? 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20'
                            : 'bg-white/10 text-white/40 hover:bg-white/20'
                        }`}
                      >
                        {coupon.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => openEdit(coupon)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
