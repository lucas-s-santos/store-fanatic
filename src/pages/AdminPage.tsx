import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Check, X, Shield, Package, Save, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Product {
  id: string
  title: string
  description: string
  price: number
  stock: number
  category: string
  sizes: string[]
  image_url: string
}

export function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Formatar sizes se vier como string de input
    let sizesArray = editingProduct.sizes || ['P', 'M', 'G', 'GG']
    if (typeof editingProduct.sizes === 'string') {
      sizesArray = (editingProduct.sizes as string).split(',').map(s => s.trim().toUpperCase())
    }

    const payload = {
      title: editingProduct.title || '',
      description: editingProduct.description || '',
      price: Number(editingProduct.price) || 0,
      stock: Number(editingProduct.stock) || 0,
      category: editingProduct.category || 'nacional',
      sizes: sizesArray,
      image_url: editingProduct.image_url || ''
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
    fetchProducts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta camisa?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) alert('Erro ao deletar: ' + error.message)
    else fetchProducts()
  }

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
              setEditingProduct({ category: 'nacional', sizes: ['P', 'M', 'G', 'GG'] })
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
                      Categoria
                    </label>
                    <select
                      value={editingProduct.category || 'nacional'}
                      onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                      className="form-input appearance-none"
                    >
                      <option value="nacional">Nacional</option>
                      <option value="internacional">Internacional</option>
                      <option value="seleções">Seleções</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Tamanhos (separados por vírgula)
                    </label>
                    <input
                      required
                      value={Array.isArray(editingProduct.sizes) ? editingProduct.sizes.join(', ') : editingProduct.sizes || ''}
                      onChange={e => setEditingProduct({...editingProduct, sizes: e.target.value as any})}
                      className="form-input"
                      placeholder="P, M, G, GG"
                    />
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
                        <th className="p-4">Categoria</th>
                        <th className="p-4">Preço</th>
                        <th className="p-4">Estoque</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      {products.map(product => (
                        <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 flex items-center gap-4">
                            <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-white/5">
                              {product.image_url && (
                                <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                              )}
                            </div>
                            <span className="font-medium truncate max-w-[200px] sm:max-w-xs text-white">
                              {product.title}
                            </span>
                          </td>
                          <td className="p-4 capitalize">{product.category}</td>
                          <td className="p-4">R$ {product.price.toFixed(2).replace('.', ',')}</td>
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
                      ))}
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
