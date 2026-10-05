-- =============================================================================
-- QUEM PODE EXECUTAR AS FUNÇÕES SECURITY DEFINER
--
-- Fecha (parcialmente) os avisos "Public/Signed-In Users Can Execute SECURITY
-- DEFINER Function" do Advisor, sem quebrar nada:
--
--   - handle_new_user, protect_profile_role: são funções de GATILHO (trigger).
--     O gatilho dispara sozinho; ninguém precisa chamá-las pela API. Revogadas
--     de PUBLIC/anon/authenticated. (Disparar trigger não exige EXECUTE.)
--
--   - increment_coupon_usage(text): é chamada no checkout (CheckoutPage.tsx via
--     supabase.rpc) por usuário LOGADO. Fica só para authenticated; tirada de
--     anon/PUBLIC.
--
--   - is_admin() e owns_order(): NÃO são mexidas de propósito. O RLS as executa
--     ao avaliar as políticas (orders, catálogo), então anon/authenticated
--     PRECISAM poder executá-las; revogar quebraria as consultas. São seguras
--     (só retornam true/false sobre o próprio usuário). O aviso do Advisor para
--     essas duas é aceitável.
--
-- Como aplicar: Supabase → SQL Editor → cole tudo e rode. Pode rodar de novo.
-- =============================================================================

DO $$
DECLARE r record;
BEGIN
  -- Gatilhos: ninguém chama direto.
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('handle_new_user', 'protect_profile_role')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
    RAISE NOTICE 'execução revogada: %(%)', r.proname, r.args;
  END LOOP;

  -- increment_coupon_usage: só usuário logado (checkout).
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'increment_coupon_usage'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
    RAISE NOTICE 'só authenticated executa: %(%)', r.proname, r.args;
  END LOOP;
END $$;

-- =============================================================================
-- CONFERÊNCIA (não altera nada)
-- =============================================================================

-- Funções SECURITY DEFINER do schema public e quem pode executá-las.
-- Esperado: handle_new_user/protect_profile_role sem anon/authenticated;
-- increment_coupon_usage só authenticated; is_admin/owns_order com anon/authenticated.
SELECT p.proname AS funcao,
       pg_get_function_identity_arguments(p.oid) AS args,
       coalesce(
         (SELECT string_agg(rp.grantee, ', ' ORDER BY rp.grantee)
          FROM information_schema.routine_privileges rp
          WHERE rp.routine_schema = 'public'
            AND rp.routine_name = p.proname
            AND rp.privilege_type = 'EXECUTE'),
         '(só owner)'
       ) AS quem_executa
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef = true
ORDER BY p.proname;
