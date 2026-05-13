import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Shield, Package, Save, Loader2, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'

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
}

const AVAILABLE_SIZES = ['P', 'M', 'G', 'GG', 'XG', '2XG']

export function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [dbLeagues, setDbLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const [prodRes, leagueRes, teamRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('leagues').select('*').order('name'),
      supabase.from('teams').select('*').order('name')
    ])

    if (leagueRes.data && teamRes.data) {
      const builtLeagues = leagueRes.data.map(l => ({
        ...l,
        logo: l.logo_url,
        teams: teamRes.data.filter(t => t.league_id === l.id).map(t => ({ ...t, logo: t.logo_url }))
      }))
      setDbLeagues(builtLeagues)
    }

    if (prodRes.error) {
      console.error('Error fetching products:', prodRes.error)
    } else {
      setProducts(prodRes.data || [])
    }

    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
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
      featured: editingProduct.featured || false
    }

    if (editingProduct.id) {
      // Update
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)
      
      if (error) alert('Erro ao atualizar: ' + error.message)
    } else {
      // Insert
      const { error } = await supabase
        .from('products')
        .insert([payload])
      
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
    if (currentSizes.includes(size)) {
      setEditingProduct({ ...editingProduct, sizes: currentSizes.filter(s => s !== size) })
    } else {
      setEditingProduct({ ...editingProduct, sizes: [...currentSizes, size] })
    }
  }

  const activeLeague = dbLeagues.find(l => l.id === editingProduct.league)

  return (
    <div className="p-8 sm:p-12 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-[1.5rem] px-6 py-8 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          <div>
            <span className="chip border-primary/20 bg-primary/5 text-primary mb-4">
              <Shield className="h-4 w-4" />
              Painel Administrativo
            </span>
            <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white sm:text-4xl">
              Gerenciar Estoque
            </h1>
          </div>
          <button
            onClick={() => {
              setEditingProduct({ 
                league: dbLeagues[0]?.id || '', 
                team: dbLeagues[0]?.teams?.[0]?.id || '', 
                sizes: ['P', 'M', 'G', 'GG'],
                featured: false 
              })
              setIsEditing(true)
            }}
            className="btn-glow-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Adicionar Camisa
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
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
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Título da Camisa
                    </label>
                    <input
                      required
                      value={editingProduct.title || ''}
                      onChange={e => setEditingProduct({...editingProduct, title: e.target.value})}
                      className="form-input"
                      placeholder="Ex: Camisa Real Madrid Home 24/25"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Descrição
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editingProduct.description || ''}
                      onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                      className="form-input resize-none"
                      placeholder="Descrição detalhada do produto..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Preço (R$)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={editingProduct.price || ''}
                      onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                      className="form-input"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Estoque (Unidades)
                    </label>
                    <input
                      required
                      type="number"
                      value={editingProduct.stock || ''}
                      onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Liga / Campeonato
                    </label>
                    <select
                      value={editingProduct.league || ''}
                      onChange={e => {
                        const newLeagueId = e.target.value
                        const newLeague = dbLeagues.find(l => l.id === newLeagueId)
                        setEditingProduct({
                          ...editingProduct, 
                          league: newLeagueId,
                          team: newLeague?.teams?.[0]?.id || ''
                        })
                      }}
                      className="form-input appearance-none"
                    >
                      <option value="" disabled>Selecione a Liga</option>
                      {dbLeagues.map(league => (
                        <option key={league.id} value={league.id}>{league.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Time / Seleção
                    </label>
                    <select
                      value={editingProduct.team || ''}
                      onChange={e => setEditingProduct({...editingProduct, team: e.target.value})}
                      className="form-input appearance-none"
                      disabled={!editingProduct.league}
                    >
                      <option value="" disabled>Selecione o Time</option>
                      {activeLeague?.teams?.map((team: any) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
                      Tamanhos Disponíveis
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {AVAILABLE_SIZES.map(size => {
                        const isSelected = (editingProduct.sizes || []).includes(size)
                        return (
                          <button
                            type="button"
                            key={size}
                            onClick={() => handleSizeToggle(size)}
                            className={`flex h-10 w-12 items-center justify-center rounded border transition-all ${
                              isSelected 
                                ? 'border-primary bg-primary/20 text-primary font-bold shadow-[0_0_10px_rgba(255,170,0,0.2)]' 
                                : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {size}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      URL da Imagem
                    </label>
                    <input
                      value={editingProduct.image_url || ''}
                      onChange={e => setEditingProduct({...editingProduct, image_url: e.target.value})}
                      className="form-input"
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer p-4 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={editingProduct.featured || false}
                        onChange={e => setEditingProduct({...editingProduct, featured: e.target.checked})}
                        className="w-5 h-5 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <div>
                        <p className="font-display font-bold uppercase text-white flex items-center gap-2">
                          <Star className="h-4 w-4 text-primary" /> Produto em Destaque
                        </p>
                        <p className="text-xs text-muted-foreground">Marque esta opção para exibir a camisa nas primeiras posições do catálogo.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn-outline px-6"
                  >
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
              ) : products.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma camisa cadastrada.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      <tr>
                        <th className="p-4">Produto</th>
                        <th className="p-4">Liga / Time</th>
                        <th className="p-4">Preço</th>
                        <th className="p-4">Estoque</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      {products.map(product => {
                        const leagueObj = dbLeagues.find(l => l.id === product.league)
                        const leagueName = leagueObj?.name || product.league || 'Geral'
                        const teamName = leagueObj?.teams?.find((t: any) => t.id === product.team)?.name || product.team || '-'
                        
                        return (
                          <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 flex items-center gap-4">
                              <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-white/5">
                                {product.image_url && (
                                  <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium truncate max-w-[200px] sm:max-w-xs text-white flex items-center gap-2">
                                  {product.featured && <Star className="h-3 w-3 text-primary fill-primary" />}
                                  {product.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">{(product.sizes || []).join(', ')}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-white text-xs">{leagueName}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{teamName}</span>
                              </div>
                            </td>
                            <td className="p-4 font-medium">R$ {product.price.toFixed(2).replace('.', ',')}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs ${
                                product.stock > 0 ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-destructive/10 text-destructive'
                              }`}>
                                {product.stock > 0 ? `${product.stock} un.` : 'Esgotado'}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(product)
                                  setIsEditing(true)
                                }}
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
