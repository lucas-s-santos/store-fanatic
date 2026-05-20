-- ============================================================================
-- SETUP COMPLETO — Novo projeto Supabase (Store Fanatic)
-- Cole TODO este arquivo no SQL Editor do novo projeto e execute.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── profiles (deve ser a PRIMEIRA tabela — outras políticas a referenciam) ───
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ── leagues ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leagues (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  logo_url   TEXT,
  country    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leagues_select" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "leagues_write"  ON public.leagues FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── teams ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id         TEXT PRIMARY KEY,
  league_id  TEXT REFERENCES public.leagues(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_select" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_write"  ON public.teams FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── products ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT UNIQUE,
  name                  TEXT,
  title                 TEXT,
  description           TEXT,
  price                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  category              TEXT,
  league                TEXT,
  team                  TEXT,
  stock_quantity        INTEGER NOT NULL DEFAULT 0,
  stock                 INTEGER DEFAULT 0,
  sizes                 TEXT[] NOT NULL DEFAULT '{}',
  image_url             TEXT,
  images                TEXT[],
  featured              BOOLEAN DEFAULT false,
  active                BOOLEAN DEFAULT true,
  type                  TEXT DEFAULT 'torcedor',
  order_priority        INTEGER DEFAULT 0,
  personalization_price NUMERIC(10,2) DEFAULT 0,
  tech_specs            JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_write"  ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── orders ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID,
  total_amount          NUMERIC(10,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pendente',
  payment_method        TEXT NOT NULL DEFAULT 'pix',
  shipping_address      JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_id            TEXT,
  customer_name         TEXT,
  customer_email        TEXT,
  customer_phone        TEXT,
  customer_cpf          TEXT,
  customer_address      TEXT,
  tracking_code         TEXT,
  coupon_code           TEXT,
  discount_amount       NUMERIC(10,2) DEFAULT 0,
  shipping_cost         NUMERIC(10,2) DEFAULT 0,
  personalization       JSONB DEFAULT '[]'::jsonb,
  notes                 TEXT,
  payment_method_detail TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update" ON public.orders FOR UPDATE USING (true);

-- ── order_items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id      UUID,
  product_title   TEXT,
  quantity        INTEGER NOT NULL,
  size            TEXT NOT NULL,
  unit_price      NUMERIC(10,2) NOT NULL,
  personalization JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_update" ON public.order_items FOR UPDATE USING (true);

-- ── order_feedback ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_feedback (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  rating     INTEGER,
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select" ON public.order_feedback FOR SELECT USING (true);
CREATE POLICY "feedback_insert" ON public.order_feedback FOR INSERT WITH CHECK (true);

-- ── coupons ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  description     TEXT,
  discount_type   TEXT NOT NULL DEFAULT 'percentage',
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_uses        INTEGER DEFAULT 0,
  used_count      INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT true,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_select" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "coupons_write"  ON public.coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── site_settings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings_select" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_write"  ON public.site_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO public.site_settings (key, value, description) VALUES
  ('store_name',              'Store Fanatic', 'Nome da loja'),
  ('whatsapp_number',         '5535988862172', 'Número do WhatsApp com DDD'),
  ('shipping_free_threshold', '299',           'Valor mínimo para frete grátis'),
  ('shipping_cost',           '19.90',         'Valor do frete padrão'),
  ('personalization_price',   '20',            'Preço adicional da personalização'),
  ('pix_key',                 '',              'Chave PIX oficial')
ON CONFLICT (key) DO NOTHING;

-- ── testimonials ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.testimonials (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  text           TEXT NOT NULL,
  rating         INTEGER DEFAULT 5,
  avatar_url     TEXT,
  active         BOOLEAN DEFAULT true,
  order_priority INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials_select" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "testimonials_write"  ON public.testimonials FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── site_stats ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_stats (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label          TEXT NOT NULL,
  value          INTEGER NOT NULL DEFAULT 0,
  suffix         TEXT DEFAULT '',
  order_priority INTEGER DEFAULT 0
);

ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_stats_select" ON public.site_stats FOR SELECT USING (true);
CREATE POLICY "site_stats_write"  ON public.site_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO public.site_stats (label, value, suffix, order_priority) VALUES
  ('Modelos exclusivos',   0,   '+', 1),
  ('Clientes satisfeitos', 0,   '+', 2),
  ('Estados atendidos',    0,   '',  3),
  ('Camisas originais',    100, '%', 4)
ON CONFLICT DO NOTHING;

-- ── Trigger: cria profile automaticamente ao registrar usuário ────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Storage bucket para logos de ligas/times (imagens de camisas → Cloudinary)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "logos_select" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "logos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');
CREATE POLICY "logos_delete" ON storage.objects FOR DELETE USING  (bucket_id = 'logos' AND auth.role() = 'authenticated');
