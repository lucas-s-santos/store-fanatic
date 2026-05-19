import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Trophy, Save, Loader2, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ImageUploader } from '../components/ui/ImageUploader'

interface League {
  id: string
  name: string
  logo_url: string
  country?: string
  teams?: Team[]
}

interface Team {
  id: string
  league_id: string
  name: string
  logo_url: string
}

type EditMode = 'none' | 'league' | 'team'

export function AdminLeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<EditMode>('none')
  const [editingLeague, setEditingLeague] = useState<Partial<League>>({})
  const [editingTeam, setEditingTeam] = useState<Partial<Team>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [leagueRes, teamRes] = await Promise.all([
      supabase.from('leagues').select('*').order('name'),
      supabase.from('teams').select('*').order('name'),
    ])
    const teams: Team[] = teamRes.data || []
    const leaguesWithTeams: League[] = (leagueRes.data || []).map(l => ({
      ...l,
      teams: teams.filter(t => t.league_id === l.id),
    }))
    setLeagues(leaguesWithTeams)
    setLoading(false)
  }

  /* ── LEAGUES ── */
  const openNewLeague = () => {
    setEditingLeague({ name: '', logo_url: '', country: '' })
    setEditMode('league')
  }

  const openEditLeague = (league: League) => {
    setEditingLeague({ ...league })
    setEditMode('league')
  }

  const handleSaveLeague = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    const payload: Record<string, string> = {
      name: editingLeague.name || '',
      logo_url: editingLeague.logo_url || '',
    }
    if (editingLeague.country !== undefined) payload.country = editingLeague.country

    if (editingLeague.id) {
      const { error } = await supabase.from('leagues').update(payload).eq('id', editingLeague.id)
      if (error) alert('Erro: ' + error.message)
    } else {
      const { error } = await supabase.from('leagues').insert([payload])
      if (error) alert('Erro: ' + error.message)
    }
    setSaving(false)
    setEditMode('none')
    fetchAll()
  }

  const handleDeleteLeague = async (id: string) => {
    if (!confirm('Excluir esta liga e TODOS os times vinculados?')) return
    const { error } = await supabase.from('leagues').delete().eq('id', id)
    if (error) alert('Erro: ' + error.message)
    else fetchAll()
  }

  /* ── TEAMS ── */
  const openNewTeam = (leagueId: string) => {
    setEditingTeam({ league_id: leagueId, name: '', logo_url: '' })
    setEditMode('team')
  }

  const openEditTeam = (team: Team) => {
    setEditingTeam({ ...team })
    setEditMode('team')
  }

  const handleSaveTeam = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      league_id: editingTeam.league_id,
      name: editingTeam.name || '',
      logo_url: editingTeam.logo_url || '',
    }

    if (editingTeam.id) {
      const { error } = await supabase.from('teams').update(payload).eq('id', editingTeam.id)
      if (error) alert('Erro: ' + error.message)
    } else {
      const { error } = await supabase.from('teams').insert([payload])
      if (error) alert('Erro: ' + error.message)
    }
    setSaving(false)
    setEditMode('none')
    fetchAll()
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Excluir este time?')) return
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) alert('Erro: ' + error.message)
    else fetchAll()
  }

  const closeForm = () => setEditMode('none')

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
            <Trophy className="h-4 w-4" />
            Ligas & Times
          </span>
          <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white">Gerenciar Ligas</h1>
        </div>
        <button onClick={openNewLeague} className="btn-glow-primary flex items-center gap-2 shrink-0">
          <Plus className="h-5 w-5" />
          Nova Liga
        </button>
      </motion.div>

      {/* League Form */}
      <AnimatePresence>
        {editMode === 'league' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <form onSubmit={handleSaveLeague} className="glass-card rounded-[1.5rem] p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-xl font-display font-bold uppercase text-white">
                  {editingLeague.id ? 'Editar Liga' : 'Nova Liga'}
                </h2>
                <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="form-label">Nome da Liga</label>
                  <input
                    required
                    value={editingLeague.name || ''}
                    onChange={e => setEditingLeague({ ...editingLeague, name: e.target.value })}
                    className="form-input"
                    placeholder=""
                  />
                </div>
                <div className="space-y-2">
                  <label className="form-label">País</label>
                  <input
                    value={editingLeague.country || ''}
                    onChange={e => setEditingLeague({ ...editingLeague, country: e.target.value })}
                    className="form-input"
                    placeholder=""
                  />
                </div>
                <div className="sm:col-span-2">
                  <ImageUploader
                    value={editingLeague.logo_url || ''}
                    onChange={url => setEditingLeague(prev => ({ ...prev, logo_url: url }))}
                    folder="league-logos"
                    label="Logo da Liga"
                    aspectRatio="square"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                <button type="button" onClick={closeForm} className="btn-outline px-6">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-glow-primary px-8 flex items-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Liga
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Form */}
      <AnimatePresence>
        {editMode === 'team' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <form onSubmit={handleSaveTeam} className="glass-card rounded-[1.5rem] p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-xl font-display font-bold uppercase text-white">
                  {editingTeam.id ? 'Editar Time' : 'Novo Time'}
                </h2>
                <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="form-label">Nome do Time</label>
                  <input
                    required
                    value={editingTeam.name || ''}
                    onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                    className="form-input"
                    placeholder=""
                  />
                </div>
                <div className="sm:col-span-2">
                  <ImageUploader
                    value={editingTeam.logo_url || ''}
                    onChange={url => setEditingTeam(prev => ({ ...prev, logo_url: url }))}
                    folder="team-logos"
                    label="Logo do Time"
                    aspectRatio="square"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                <button type="button" onClick={closeForm} className="btn-outline px-6">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-glow-primary px-8 flex items-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Time
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leagues List */}
      {loading ? (
        <div className="p-12 flex justify-center glass-card rounded-[1.5rem]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : leagues.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground glass-card rounded-[1.5rem]">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma liga cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leagues.map((league, li) => (
            <motion.div
              key={league.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: li * 0.04 }}
              className="glass-card rounded-2xl overflow-hidden"
            >
              {/* League Row */}
              <div className="flex items-center gap-4 px-5 py-4">
                {league.logo_url ? (
                  <img
                    src={league.logo_url}
                    alt={league.name}
                    className="h-8 w-8 object-contain shrink-0"
                    onError={e => {
                      const img = e.target as HTMLImageElement
                      img.style.display = 'none'
                      img.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div className={`h-8 w-8 rounded bg-white/10 shrink-0 flex items-center justify-center ${league.logo_url ? 'hidden' : ''}`}>
                  <Trophy className="h-4 w-4 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">{league.name}</p>
                  {league.country && (
                    <p className="text-[10px] text-muted-foreground">{league.country}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground text-xs mr-2 shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  {league.teams?.length || 0} times
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openNewTeam(league.id)}
                    className="p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-md transition-colors"
                    title="Adicionar Time"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEditLeague(league)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                    title="Editar Liga"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLeague(league.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    title="Excluir Liga"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setExpanded(expanded === league.id ? null : league.id)}
                    className="p-2 text-muted-foreground hover:text-white rounded-md transition-colors"
                  >
                    {expanded === league.id
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Teams */}
              <AnimatePresence>
                {expanded === league.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    {!league.teams || league.teams.length === 0 ? (
                      <p className="px-6 py-4 text-sm text-muted-foreground">
                        Nenhum time. Clique no <span className="text-[#25D366]">+</span> para adicionar.
                      </p>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {league.teams.map(team => (
                          <div key={team.id} className="flex items-center gap-4 px-6 py-3 bg-white/[0.015] hover:bg-white/[0.03] transition-colors">
                            {team.logo_url ? (
                              <img
                                src={team.logo_url}
                                alt={team.name}
                                className="h-6 w-6 object-contain shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : (
                              <div className="h-6 w-6 rounded bg-white/10 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{team.name}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditTeam(team)}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeam(team.id)}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
