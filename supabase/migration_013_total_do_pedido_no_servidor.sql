-- =============================================================================
-- O TOTAL DO PEDIDO PASSA A SER CALCULADO PELO BANCO
--
-- Problema: o checkout (CheckoutPage.tsx) grava total_amount, shipping_cost,
-- discount_amount e o unit_price de cada item com os valores que o NAVEGADOR
-- calculou. Com a chave pública, qualquer usuário logado consegue inserir um
-- pedido de uma camisa de R$ 149,90 com total de R$ 1,00. Como o pagamento é
-- conferido no painel, o admin veria "R$ 1,00" e o comprovante de R$ 1,00
-- batendo.
--
-- O que faz (só para pedidos vindos do site, papel anon/authenticated;
-- scripts com a secret key e o painel admin não são afetados):
--
--   1. order_items (BEFORE INSERT): unit_price = preço do produto no catálogo
--      + taxa de personalização, se o item tiver nome/número. A taxa segue a
--      mesma regra da ProductPage: personalization_price do produto, ou a
--      configuração da loja quando o produto tem 0 ou nulo.
--   2. orders (BEFORE INSERT): o pedido nasce com total, frete e desconto
--      zerados. Pedido sem itens fica em R$ 0,00.
--   3. order_items (AFTER INSERT): recalcula o pedido com a mesma regra do
--      checkout: subtotal dos itens, frete (grátis a partir de
--      shipping_free_threshold) e cupom (ativo, dentro da validade, com uso
--      disponível e valor mínimo atingido; desconto limitado ao subtotal).
--
-- O front lê o total de volta depois de gravar os itens, então o valor
-- mostrado na tela do PIX é sempre o do banco.
--
-- Como aplicar: Supabase → SQL Editor → cole tudo e rode. Pode rodar de novo.
-- =============================================================================

-- Pedido vindo do site (chave pública), e não de script ou do próprio banco.
CREATE OR REPLACE FUNCTION public.is_storefront_request()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.role(), '') IN ('anon', 'authenticated')
$$;

-- ── 1. preço de cada item vem do catálogo ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.order_item_price_from_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
  v_fee   numeric;
BEGIN
  IF NOT public.is_storefront_request() THEN
    RETURN NEW;
  END IF;

  SELECT p.price, p.personalization_price INTO v_price, v_fee
  FROM public.products p
  WHERE p.id = NEW.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado no catálogo: %', NEW.product_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
    RAISE EXCEPTION 'Quantidade inválida: %', NEW.quantity
      USING ERRCODE = 'check_violation';
  END IF;

  IF jsonb_typeof(NEW.personalization) = 'array'
     AND jsonb_array_length(NEW.personalization) > 0 THEN
    v_fee := coalesce(
      nullif(v_fee, 0),
      (SELECT nullif(s.value, '')::numeric FROM public.site_settings s WHERE s.key = 'personalization_price'),
      20
    );
    v_price := v_price + v_fee;
  END IF;

  NEW.unit_price := round(v_price, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_item_price_from_catalog ON public.order_items;
CREATE TRIGGER order_item_price_from_catalog
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_item_price_from_catalog();

-- ── 2. pedido nasce zerado ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.order_reset_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_storefront_request() THEN
    NEW.total_amount    := 0;
    NEW.shipping_cost   := 0;
    NEW.discount_amount := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_reset_totals ON public.orders;
CREATE TRIGGER order_reset_totals
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.order_reset_totals();

-- ── 3. total recalculado a cada item gravado ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.order_recalculate_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal  numeric;
  v_threshold numeric;
  v_ship_cost numeric;
  v_shipping  numeric;
  v_discount  numeric := 0;
  v_code      text;
  c           public.coupons%ROWTYPE;
BEGIN
  IF NOT public.is_storefront_request() THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(sum(i.unit_price * i.quantity), 0) INTO v_subtotal
  FROM public.order_items i
  WHERE i.order_id = NEW.order_id;

  SELECT coalesce((SELECT nullif(value, '')::numeric FROM public.site_settings WHERE key = 'shipping_free_threshold'), 299),
         coalesce((SELECT nullif(value, '')::numeric FROM public.site_settings WHERE key = 'shipping_cost'), 19.90)
  INTO v_threshold, v_ship_cost;

  v_shipping := CASE WHEN v_subtotal >= v_threshold THEN 0 ELSE v_ship_cost END;

  SELECT o.coupon_code INTO v_code FROM public.orders o WHERE o.id = NEW.order_id;

  IF v_code IS NOT NULL AND v_code <> '' THEN
    SELECT * INTO c FROM public.coupons WHERE code = upper(trim(v_code)) AND active = true;
    IF FOUND
       AND (c.expires_at IS NULL OR c.expires_at >= now())
       AND (coalesce(c.max_uses, 0) = 0 OR coalesce(c.used_count, 0) < c.max_uses)
       AND (coalesce(c.min_order_value, 0) = 0 OR v_subtotal >= c.min_order_value) THEN
      v_discount := CASE WHEN c.discount_type = 'percentage'
                         THEN v_subtotal * c.discount_value / 100
                         ELSE c.discount_value END;
      v_discount := least(v_discount, v_subtotal);
    END IF;
  END IF;

  UPDATE public.orders
     SET shipping_cost   = v_shipping,
         discount_amount = round(v_discount, 2),
         total_amount    = round(v_subtotal + v_shipping - v_discount, 2)
   WHERE id = NEW.order_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS order_recalculate_totals ON public.order_items;
CREATE TRIGGER order_recalculate_totals
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_recalculate_totals();

-- Gatilhos disparam sozinhos; ninguém precisa chamá-los pela API.
REVOKE ALL ON FUNCTION public.order_item_price_from_catalog() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.order_reset_totals()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.order_recalculate_totals()     FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- CONFERÊNCIA (não altera nada)
-- =============================================================================

-- Esperado: os três gatilhos listados.
SELECT event_object_table AS tabela, trigger_name AS gatilho, action_timing AS quando
FROM information_schema.triggers
WHERE trigger_name IN ('order_item_price_from_catalog', 'order_reset_totals', 'order_recalculate_totals')
ORDER BY tabela, gatilho;

-- Pedidos anteriores a esta migration com item mais barato que o preço atual
-- do catálogo, ou com total menor que a soma dos itens + frete - desconto.
-- Pode aparecer falso positivo se o preço do produto subiu depois do pedido.
-- Esperado: nenhuma linha. Se aparecer, confira antes de enviar o pedido.
SELECT o.id, o.created_at, o.status, o.customer_name, o.total_amount,
       round(sum(i.unit_price * i.quantity) + coalesce(o.shipping_cost, 0) - coalesce(o.discount_amount, 0), 2) AS total_pelos_itens,
       bool_or(i.unit_price < p.price) AS item_abaixo_do_catalogo
FROM public.orders o
JOIN public.order_items i ON i.order_id = o.id
LEFT JOIN public.products p ON p.id = i.product_id
GROUP BY o.id
HAVING bool_or(i.unit_price < p.price)
    OR o.total_amount < round(sum(i.unit_price * i.quantity) + coalesce(o.shipping_cost, 0) - coalesce(o.discount_amount, 0), 2)
ORDER BY o.created_at DESC;
