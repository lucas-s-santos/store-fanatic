-- =============================================================================
-- PRIVACIDADE DOS PEDIDOS E PROTEÇÃO DO CARGO DE ADMIN
--
-- Substitui as políticas "USING (true)" de migration_rls_fix.sql.
--
-- Problema encontrado em 2026-10-03, testando só com a chave pública (anon),
-- que vai no JavaScript do site:
--   1. Qualquer pessoa lista TODOS os pedidos, com nome, CPF, telefone e
--      endereço (o "UUID secreto" não protege: dá para listar sem saber o id).
--   2. Qualquer pessoa pode ALTERAR qualquer pedido (ex.: marcar como pago).
--   3. order_items e order_feedback também ficam abertos.
--   4. profiles_update (migration_roles.sql) deixa cada usuário editar a
--      própria linha inteira, inclusive a coluna "role" (vira admin sozinho).
--
-- Depois desta migration:
--   - cliente logado vê e cria só os próprios pedidos;
--   - admin vê e altera todos;
--   - o webhook do Mercado Pago usa service_role e continua ignorando o RLS;
--   - só admin (ou o SQL Editor / service_role) muda o cargo de alguém.
--
-- Efeito colateral: o link /pedido/:id só abre para o dono logado (ou admin).
-- O checkout já exige login, então pedidos novos sempre têm user_id.
--
-- Como aplicar: Supabase → SQL Editor → cole e rode. Pode rodar mais de uma vez.
-- =============================================================================

-- ── Funções auxiliares ────────────────────────────────────────────────────────

-- SECURITY DEFINER: lê profiles sem passar pelo RLS de profiles (evita recursão).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Dono do pedido: pelo user_id ou, em pedidos antigos sem user_id, pelo e-mail
-- da conta logada (mesma regra da página "Meus pedidos").
CREATE OR REPLACE FUNCTION public.owns_order(p_user_id uuid, p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    p_user_id = auth.uid()
    OR (p_user_id IS NULL AND lower(p_email) = lower(auth.jwt() ->> 'email'))
  )
$$;

-- ── orders ────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update" ON public.orders;

CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (public.owns_order(user_id, customer_email) OR public.is_admin());

-- Cliente cria pedido em nome próprio e sempre como "aguardando pagamento".
CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (user_id = auth.uid() AND status = 'aguardando_pagamento');

-- Status, rastreio etc.: só admin (o webhook usa service_role).
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── order_items ───────────────────────────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update" ON public.order_items;

CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.owns_order(o.user_id, o.customer_email)
    )
  );

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE POLICY "order_items_update" ON public.order_items
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── order_feedback ────────────────────────────────────────────────────────────
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_select" ON public.order_feedback;
DROP POLICY IF EXISTS "feedback_insert" ON public.order_feedback;

CREATE POLICY "feedback_select" ON public.order_feedback
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.owns_order(o.user_id, o.customer_email)
    )
  );

-- Só o dono avalia, e só depois de entregue (igual à tela de acompanhamento).
CREATE POLICY "feedback_insert" ON public.order_feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.status = 'entregue'
        AND public.owns_order(o.user_id, o.customer_email)
    )
  );

-- ── profiles: ninguém se promove a admin ──────────────────────────────────────
-- A política de UPDATE continua deixando cada um editar nome/telefone; este
-- gatilho barra só a troca de cargo vinda do site (anon/authenticated).
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') AND NOT public.is_admin() THEN
    IF (TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'user')
       OR (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Somente administradores podem alterar o cargo de um usuário.';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ── Conferência (rode depois, deslogado/anon deve dar 0 linhas) ───────────────
-- SELECT policyname, cmd, qual FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('orders', 'order_items', 'order_feedback');
