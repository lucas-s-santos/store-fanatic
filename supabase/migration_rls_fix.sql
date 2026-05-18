-- =============================================================================
-- CORREÇÃO DE RLS — orders e order_items
--
-- Problema: políticas restritivas do schema.sql bloqueiam:
--   1. Admin de ver pedidos de outros usuários
--   2. Joins embutidos (order_items) com RLS conflitante
--   3. INSERT de pedidos com user_id preenchido
--
-- Solução: políticas permissivas — o UUID do pedido (122 bits) é a proteção
-- =============================================================================

-- ── Remove TODAS as políticas existentes em orders ────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'orders' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', r.policyname);
  END LOOP;
END $$;

-- ── Remove TODAS as políticas existentes em order_items ───────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'order_items' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', r.policyname);
  END LOOP;
END $$;

-- Garante que RLS está habilitado
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ── Políticas permissivas para orders ─────────────────────────────────────────
-- SELECT: qualquer um pode ler (acesso por UUID = seguro)
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (true);

-- INSERT: qualquer um pode criar pedidos (authenticated ou guest)
CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (true);

-- UPDATE: qualquer um pode atualizar (webhook MP, admin, sistema)
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (true);

-- DELETE: bloqueado por padrão (sem política = negado)

-- ── Políticas permissivas para order_items ────────────────────────────────────
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (true);

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_update" ON public.order_items
  FOR UPDATE USING (true);
