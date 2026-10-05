import { useEffect, useMemo, useState } from 'react'

import {
  fetchLeaguesAndTeams,
  fetchShowcaseProducts,
  type ShowcaseLeague,
  type ShowcaseProduct,
  type ShowcaseTeam,
} from '@/lib/catalog'

/** Camisas em destaque por liga: a vitrine da home mostra 8, o mega menu 4. */
const PICKS = 8

export interface LeagueShowcase {
  count: number
  cover?: string
  /** Uma camisa de cada time, espalhando a escolha pela liga. */
  picks: ShowcaseProduct[]
  topTeams: ShowcaseTeam[]
}

/**
 * Ligas e times chegam rápido (o menu já aparece); as camisas vêm depois e
 * preenchem as fotos do mega menu. As duas buscas ficam em cache no catalog.ts.
 */
export function useNavData() {
  const [leagues, setLeagues] = useState<ShowcaseLeague[]>([])
  const [teams, setTeams] = useState<ShowcaseTeam[]>([])
  const [products, setProducts] = useState<ShowcaseProduct[]>([])

  useEffect(() => {
    let active = true
    fetchLeaguesAndTeams()
      .then((data) => {
        if (!active) return
        setLeagues(data.leagues)
        setTeams(data.teams)
      })
      .catch(() => {})
    fetchShowcaseProducts()
      .then((data) => active && setProducts(data))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Determinístico de propósito: o menu não muda de foto a cada render.
  const showcase = useMemo(() => {
    const byLeague = new Map<string, LeagueShowcase>()
    for (const league of leagues) {
      const items = products.filter((p) => p.league === league.id && p.image_url)
      const perTeam = new Map<string, ShowcaseProduct[]>()
      for (const product of items) perTeam.set(product.team, [...(perTeam.get(product.team) ?? []), product])

      const leagueTeams = teams
        .filter((t) => t.league_id === league.id)
        .sort((a, b) => (perTeam.get(b.id)?.length ?? 0) - (perTeam.get(a.id)?.length ?? 0) || a.name.localeCompare(b.name))

      // Times empatam em número de modelos; espalhar a escolha pela lista
      // evita mostrar sempre os quatro primeiros da ordem alfabética.
      const withPhotos = leagueTeams.filter((team) => perTeam.has(team.id))
      const step = Math.max(1, Math.floor(withPhotos.length / PICKS))
      const picks = withPhotos
        .filter((_, index) => index % step === 0)
        .slice(0, PICKS)
        .map((team) => {
          const options = perTeam.get(team.id) ?? []
          return options.find((p) => p.featured) ?? options[0]
        })

      byLeague.set(league.id, {
        count: items.length,
        cover: (items.find((p) => p.featured) ?? picks[0])?.image_url,
        picks,
        topTeams: leagueTeams.slice(0, 8),
      })
    }
    return byLeague
  }, [leagues, teams, products])

  const teamName = useMemo(
    () => new Map(teams.map((team) => [`${team.league_id}:${team.id}`, team.name] as const)),
    [teams],
  )

  return { leagues, showcase, teamName }
}
