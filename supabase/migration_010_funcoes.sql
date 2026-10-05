-- =============================================================================
-- ENDURECIMENTO DAS FUNÇÕES (Function Search Path Mutable) + TRANCAR execute_sql
--
-- Fecha os avisos "Function Search Path Mutable" do Security Advisor e remove
-- o risco de a função public.execute_sql rodar SQL arbitrário pela API pública.
--
-- Contexto: o site NÃO usa .rpc() — nenhuma dessas funções é chamada pelo
-- front. execute_sql e increment_coupon_usage foram criadas direto no banco
-- (não estão nas migrations do repo).
--
-- Como aplicar: Supabase → SQL Editor → cole tudo e rode. Pode rodar de novo.
-- =============================================================================

-- ── 1. Fixa search_path = public nas funções sinalizadas (seguro, idempotente)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('handle_new_user', 'increment_coupon_usage', 'execute_sql')
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', r.proname, r.args);
    RAISE NOTICE 'search_path = public em %(%)', r.proname, r.args;
  END LOOP;
END $$;

-- ── 2. Tira o direito de executar a execute_sql de quem vem pela chave pública
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'execute_sql'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.execute_sql(%s) FROM PUBLIC, anon, authenticated', r.args);
    RAISE NOTICE 'execute_sql(%): execução revogada de PUBLIC/anon/authenticated', r.args;
  END LOOP;
END $$;

-- =============================================================================
-- 3. CONFERÊNCIA (não altera nada)
-- =============================================================================

-- (a) Veja o código da execute_sql. Se ela NÃO for usada por nada (o site não
--     usa), o ideal é dropar de vez: DROP FUNCTION public.execute_sql(<args>);
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS argumentos,
       pg_get_functiondef(p.oid)                 AS definicao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'execute_sql';

-- (b) Quem ainda pode executar a execute_sql (esperado: só postgres/service_role).
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'execute_sql';

-- (c) Funções do schema public SEM search_path fixo (ideal: lista vazia).
SELECT p.proname AS funcao_sem_search_path
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) c
    WHERE c LIKE 'search_path=%'
  )
ORDER BY p.proname;
