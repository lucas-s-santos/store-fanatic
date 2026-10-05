-- =============================================================================
-- POLÍTICAS LIMPAS DO CATÁLOGO (leitura pública, escrita só admin)
--
-- Resolve:
--   1. "Multiple Permissive Policies" do Advisor — havia _select E _write
--      (FOR ALL) na mesma tabela; FOR ALL também cobre SELECT, então sobravam
--      duas políticas permissivas na leitura.
--   2. Risco de escrita pública: migrations antigas (migration_002/full)
--      criaram "Allow all on X" FOR ALL USING (true), que deixa QUALQUER UM
--      escrever. Conforme a ordem em que rodaram, podem estar ativas.
--
-- O que faz: para cada tabela de catálogo, apaga TODAS as políticas atuais e
-- recria o conjunto canônico:
--   - SELECT liberado para todos (catálogo é público);
--   - INSERT/UPDATE/DELETE só para admin, via (select public.is_admin())
--     — o subquery evita reavaliar por linha (fecha "Auth RLS Init Plan").
-- Sem FOR ALL, então o SELECT fica com uma única política permissiva.
--
-- NÃO mexe em orders/order_items/order_feedback/profiles (migration 008).
-- Requer a função public.is_admin() (criada na migration 008).
--
-- Como aplicar: Supabase → SQL Editor → cole tudo e rode. Pode rodar de novo.
-- =============================================================================

DO $$
DECLARE
  t text;
  r record;
  tabelas text[] := ARRAY[
    'leagues', 'teams', 'products', 'coupons',
    'site_settings', 'site_stats', 'testimonials'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      -- apaga todas as políticas atuais da tabela
      FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
      END LOOP;

      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- leitura pública
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_select', t);
      -- escrita só admin (comandos separados: nada de FOR ALL)
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK ((select public.is_admin()))', t || '_insert', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()))', t || '_update', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING ((select public.is_admin()))', t || '_delete', t);

      RAISE NOTICE 'políticas recriadas em public.%', t;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- CONFERÊNCIA (não altera nada)
-- =============================================================================

-- (a) Políticas por tabela: deve haver 1 SELECT + 1 INSERT + 1 UPDATE + 1 DELETE.
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('leagues','teams','products','coupons','site_settings','site_stats','testimonials')
ORDER BY tablename, cmd, policyname;

-- (b) Sobrou alguma combinação tabela+comando com MAIS de uma política
--     permissiva? O ideal é vir VAZIO.
SELECT tablename, cmd, count(*) AS qtd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('leagues','teams','products','coupons','site_settings','site_stats','testimonials')
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING count(*) > 1
ORDER BY tablename, cmd;
