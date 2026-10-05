-- =============================================================================
-- ENDURECIMENTO DE SEGURANÇA (RLS nas tabelas internas) + CONFERÊNCIA
--
-- Resolve o alerta CRÍTICO do Security Advisor ("RLS Disabled in Public" em
-- public.keep_alive) e protege as tabelas internas que o site NUNCA lê, mas o
-- webhook escreve (activity_logs, payment_records).
--
-- Seguro porque:
--   - o front não acessa keep_alive / activity_logs / payment_records;
--   - o webhook usa a secret key (service_role / sb_secret_...), que ignora RLS;
--   - sem política de SELECT, a chave pública (anon) não lê nada dessas tabelas.
--   - o ping anti-pausa continua valendo: a requisição conta como atividade
--     mesmo voltando 0 linhas.
--
-- Como aplicar: Supabase → SQL Editor → cole tudo e rode. Pode rodar de novo.
-- =============================================================================

-- ── 1. Liga o RLS nas tabelas internas (só se existirem) ──────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['keep_alive', 'activity_logs', 'payment_records']
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'RLS ligado em public.%', t;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- 2. CONFERÊNCIA — rode e confira os resultados (não altera nada)
-- =============================================================================

-- (a) Tabelas públicas SEM RLS: o ideal é esta lista vir VAZIA.
SELECT tablename AS tabela_sem_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- (b) Tabelas com RLS ligado mas SEM nenhuma política: ninguém (fora a secret
--     key) lê/escreve. Esperado para keep_alive/activity_logs/payment_records.
--     Se aparecer uma tabela que o site PRECISA ler (ex.: products), falta uma
--     política de SELECT para anon.
SELECT t.tablename AS rls_sem_politica
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- (c) Confirma que a migration 008 (privacidade dos pedidos) está aplicada:
--     devem aparecer orders_select/insert/update, order_items_* e feedback_*.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'order_items', 'order_feedback')
ORDER BY tablename, policyname;
