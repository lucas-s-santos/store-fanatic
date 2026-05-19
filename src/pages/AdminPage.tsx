import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Shield, Package, Save, Loader2, Star, ToggleLeft, ToggleRight, ChevronDown, Check } from 'lucide-react'
import { resolveAssetUrl } from '../lib/assets'
import { supabase } from '../lib/supabase'
import { ImageUploader } from '../components/ui/ImageUploader'

interface Product {
  id: string
  title: string
  description: string
  price: number
  stock: number
  category: string
  league: string
  team: string
  sizes: string[]
  image_url: string
  featured: boolean
  active: boolean
  type: string
  personalization_price: number
}

function AdminSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled = false,
}: {
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative" translate="no">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`form-input w-full flex items-center justify-between gap-2 text-left ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={selected ? 'text-white' : 'text-muted-foreground text-sm'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl overflow-hidden max-h-56 overflow-y-auto"
          >
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.06] ${
                  opt.value === value ? 'text-primary bg-primary/10' : 'text-white/80'
                }`}
              >
                {opt.label}
                {opt.value === value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const AVAILABLE_SIZES = ['P', 'M', 'G', 'GG', 'XG', '2XG']
const PRODUCT_TYPES = [
  { value: 'torcedor', label: 'Torcedor' },
  { value: 'jogador', label: 'Jogador' },
  { value: 'retro', label: 'Retrô' },
]

export function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [dbLeagues, setDbLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({})
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [prodRes, leagueRes, teamRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('leagues').select('*').order('name'),
      supabase.from('teams').select('*').order('name'),
    ])

    if (leagueRes.data && teamRes.data) {
      setDbLeagues(leagueRes.data.map(l => ({
        ...l,
        teams: teamRes.data.filter(t => t.league_id === l.id),
      })))
    }

    if (!prodRes.error) setProducts(prodRes.data || [])
    setLoading(false)
  }

  const openNew = () => {
    setEditingProduct({
      league: dbLeagues[0]?.id || '',
      team: dbLeagues[0]?.teams?.[0]?.id || '',
      sizes: ['P', 'M', 'G', 'GG'],
      featured: false,
      active: true,
      type: 'torcedor',
      personalization_price: 20,
    })
    setIsEditing(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setIsEditing(true)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      title: editingProduct.title || '',
      description: editingProduct.description || '',
      price: Number(editingProduct.price) || 0,
      stock: Number(editingProduct.stock) || 0,
      category: editingProduct.category || 'camisas',
      league: editingProduct.league || '',
      team: editingProduct.team || '',
      sizes: editingProduct.sizes || [],
      image_url: editingProduct.image_url || '',
      featured: editingProduct.featured || false,
      active: editingProduct.active !== false,
      type: editingProduct.type || 'torcedor',
      personalization_price: Number(editingProduct.personalization_price) || 0,
    }

    if (editingProduct.id) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
      if (error) alert('Erro ao atualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('products').insert([payload])
      if (error) alert('Erro ao criar: ' + error.message)
    }

    setSaving(false)
    setIsEditing(false)
    setEditingProduct({})
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta camisa?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) alert('Erro ao deletar: ' + error.message)
    else fetchData()
  }

  const handleSizeToggle = (size: string) => {
    const currentSizes = editingProduct.sizes || []
    setEditingProduct({
      ...editingProduct,
      sizes: currentSizes.includes(size)
        ? currentSizes.filter(s => s !== size)
        : [...currentSizes, size],
    })
  }

  const activeLeague = dbLeagues.find(l => l.id === editingProduct.league)
  const filteredProducts = products.filter(p =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <Shield className="h-4 w-4" />
            Painel Administrativo
          </span>
          <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white">
            Gerenciar Estoque
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar camisa..."
            className="form-input h-10 text-sm w-48"
          />
          <button onClick={openNew} className="btn-glow-primary flex items-center gap-2 shrink-0">
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <form onSubmit={handleSave} className="glass-card rounded-[1.5rem] p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-xl font-display font-bold uppercase text-white">
                  {editingProduct.id ? 'Editar Camisa' : 'Nova Camisa'}
                </h2>
                <button type="button" onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Título */}
                <div className="space-y-2 md:col-span-2">
                  <label className="form-label">Título da Camisa</label>
                  <input
                    required
                    value={editingProduct.title || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                    className="form-input"
                    placeholder="Ex: Camisa Real Madrid Home 24/25"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-2 md:col-span-2">
                  <label className="form-label">Descrição</label>
                  <textarea
                    required
                    rows={3}
                    value={editingProduct.description || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="form-input resize-none"
                    placeholder="Descrição detalhada do produto..."
                  />
                </div>

                {/* Preço */}
                <div className="space-y-2">
                  <label className="form-label">Preço (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.price || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>

                {/* Preço Personalização */}
                <div className="space-y-2">
                  <label className="form-label">Preço da Personalização (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.personalization_price ?? 20}
                    onChange={e => setEditingProduct({ ...editingProduct, personalization_price: Number(e.target.value) })}
                    className="form-input"
                    placeholder="20.00"
                  />
                </div>

                {/* Estoque */}
                <div className="space-y-2">
                  <label className="form-label">Estoque (Unidades)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={editingProduct.stock || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="form-input"
                    placeholder="0"
                  />
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <label className="form-label">Tipo de Camisa</label>
                  <AdminSelect
                    value={editingProduct.type || 'torcedor'}
                    onChange={val => setEditingProduct({ ...editingProduct, type: val })}
                    options={PRODUCT_TYPES}
                    placeholder="Selecione o Tipo"
                  />
                </div>

                {/* Liga */}
                <div className="space-y-2">
                  <label className="form-label">Liga / Campeonato</label>
                  <AdminSelect
                    value={editingProduct.league || ''}
                    onChange={val => {
                      const newLeague = dbLeagues.find(l => l.id === val)
                      setEditingProduct({
                        ...editingProduct,
                        league: val,
                        team: newLeague?.teams?.[0]?.id || '',
                      })
                    }}
                    options={dbLeagues.map(l => ({ value: l.id, label: l.name }))}
                    placeholder="Selecione a Liga"
                  />
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <label className="form-label">Time / Seleção</label>
                  <AdminSelect
                    value={editingProduct.team || ''}
                    onChange={val => setEditingProduct({ ...editingProduct, team: val })}
                    options={(activeLeague?.teams || []).map((t: any) => ({ value: t.id, label: t.name }))}
                    placeholder="Selecione o Time"
                    disabled={!editingProduct.league}
                  />
                </div>

                {/* Tamanhos */}
                <div className="space-y-3 md:col-span-2">
                  <label className="form-label">Tamanhos Disponíveis</label>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABLE_SIZES.map(size => {
                      const selected = (editingProduct.sizes || []).includes(size)
                      return (
                        <button
                          type="button"
                          key={size}
                          onClick={() => handleSizeToggle(size)}
                          className={`flex h-10 w-12 items-center justify-center rounded border transition-all text-sm font-bold ${
                            selected
                              ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,170,0,0.2)]'
                              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Imagem */}
                <div className="md:col-span-2">
                  <ImageUploader
                    value={editingProduct.image_url || ''}
                    onChange={url => setEditingProduct({ ...editingProduct, image_url: url })}
                    folder="jersey"
                    label="Foto da Camisa"
                    aspectRatio="portrait"
                  />
                </div>

                {/* Toggles */}
                <div className="md:col-span-2 flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...editingProduct, featured: !editingProduct.featured })}
                    className={`flex-1 flex items-center gap-3 p-4 border rounded-xl transition-colors ${
                      editingProduct.featured
                        ? 'border-primary/30 bg-primary/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Star className={`h-5 w-5 ${editingProduct.featured ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                    <div className="text-left">
                      <p className="font-display font-bold uppercase text-sm text-white">Produto em Destaque</p>
                      <p className="text-[10px] text-muted-foreground">Aparece nas primeiras posições</p>
                    </div>
                    {editingProduct.featured
                      ? <ToggleRight className="h-5 w-5 text-primary ml-auto" />
                      : <ToggleLeft className="h-5 w-5 text-muted-foreground ml-auto" />
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...editingProduct, active: !editingProduct.active })}
                    className={`flex-1 flex items-center gap-3 p-4 border rounded-xl transition-colors ${
                      editingProduct.active !== false
                        ? 'border-[#25D366]/30 bg-[#25D366]/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Package className={`h-5 w-5 ${editingProduct.active !== false ? 'text-[#25D366]' : 'text-muted-foreground'}`} />
                    <div className="text-left">
                      <p className="font-display font-bold uppercase text-sm text-white">Produto Ativo</p>
                      <p className="text-[10px] text-muted-foreground">Visível na loja para clientes</p>
                    </div>
                    {editingProduct.active !== false
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
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-glow-primary px-8 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Camisa
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="product-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card rounded-[1.5rem] overflow-hidden"
          >
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{searchTerm ? 'Nenhuma camisa encontrada.' : 'Nenhuma camisa cadastrada.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <tr>
                      <th className="p-4">Produto</th>
                      <th className="p-4">Liga / Time</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Preço</th>
                      <th className="p-4">Estoque</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {filteredProducts.map(product => {
                      const leagueObj = dbLeagues.find(l => l.id === product.league)
                      const leagueName = leagueObj?.name || product.league || 'Geral'
                      const teamName = leagueObj?.teams?.find((t: any) => t.id === product.team)?.name || product.team || '-'

                      return (
                        <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-white/5">
                                {product.image_url && (
                                  <img
                                    src={resolveAssetUrl(product.image_url)}
                                    alt={product.title}
                                    className="h-full w-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                  />
                                )}
                              </div>
                              <div>
                                <span className="font-medium text-white flex items-center gap-1.5 truncate max-w-[180px]">
                                  {product.featured && <Star className="h-3 w-3 text-primary fill-primary shrink-0" />}
                                  {product.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{(product.sizes || []).join(', ')}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-white block">{leagueName}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{teamName}</span>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/70">
                              {product.type || 'torcedor'}
                            </span>
                          </td>
                          <td className="p-4 font-medium">R$ {Number(product.price).toFixed(2).replace('.', ',')}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              product.stock > 0 ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-destructive/10 text-destructive'
                            }`}>
                              {product.stock > 0 ? `${product.stock} un.` : 'Esgotado'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              product.active !== false
                                ? 'bg-[#25D366]/10 text-[#25D366]'
                                : 'bg-white/10 text-white/40'
                            }`}>
                              {product.active !== false ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1">
                            <button
                              onClick={() => openEdit(product)}
                              className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
