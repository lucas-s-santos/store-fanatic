-- Migration 007: Fix RLS for leagues, teams and products
-- Garante que qualquer visitante pode LER ligas, times e produtos.
-- Escrita exige cargo admin.

-- ── LEAGUES ──────────────────────────────────────────────────────────────────
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on leagues"    ON public.leagues;
DROP POLICY IF EXISTS "leagues_select"          ON public.leagues;
DROP POLICY IF EXISTS "leagues_write"           ON public.leagues;

CREATE POLICY "leagues_select" ON public.leagues
  FOR SELECT USING (true);

CREATE POLICY "leagues_write" ON public.leagues
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── TEAMS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on teams"      ON public.teams;
DROP POLICY IF EXISTS "teams_select"            ON public.teams;
DROP POLICY IF EXISTS "teams_write"             ON public.teams;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "teams_write" ON public.teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── PRODUCTS ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Products are viewable by everyone." ON public.products;
DROP POLICY IF EXISTS "Allow all on products."             ON public.products;
DROP POLICY IF EXISTS "products_select"                    ON public.products;
DROP POLICY IF EXISTS "products_write"                     ON public.products;

CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "products_write" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
