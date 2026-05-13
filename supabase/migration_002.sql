-- Migration 002: Site content, settings, product images, addresses

-- Site settings (configurações globais da loja)
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on site_settings" ON public.site_settings;
CREATE POLICY "Allow all on site_settings" ON public.site_settings FOR ALL USING (true);

INSERT INTO public.site_settings (key, value, description) VALUES
    ('store_name', 'Store Fanatic', 'Nome da loja'),
    ('whatsapp_number', '5535988862172', 'Número do WhatsApp com DDD'),
    ('shipping_free_threshold', '299', 'Valor mínimo para frete grátis'),
    ('shipping_cost', '19.90', 'Valor do frete padrão'),
    ('personalization_price', '20', 'Preço adicional da personalização'),
    ('pix_key', 'c5b76c9a-ccd1-4e55-bfdd-c69d17b83aa95', 'Chave PIX oficial')
ON CONFLICT (key) DO NOTHING;

-- Testimonials depoimentos reais
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    avatar_url TEXT,
    active BOOLEAN DEFAULT true,
    order_priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on testimonials" ON public.testimonials;
CREATE POLICY "Allow all on testimonials" ON public.testimonials FOR ALL USING (true);

INSERT INTO public.testimonials (name, text, rating) VALUES
    ('Lucas M.', 'Qualidade incrível! A camisa do Vasco chegou perfeita, tecido de primeira.', 5),
    ('Ana C.', 'Atendimento via WhatsApp foi super rápido. Recomendo demais!', 5),
    ('Pedro S.', 'Já comprei 3 camisas e todas vieram impecáveis. Virei cliente fiel.', 5)
ON CONFLICT DO NOTHING;

-- Site stats (dados reais da loja)
CREATE TABLE IF NOT EXISTS public.site_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    value INTEGER NOT NULL,
    suffix TEXT DEFAULT '',
    order_priority INTEGER DEFAULT 0
);

ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on site_stats" ON public.site_stats;
CREATE POLICY "Allow all on site_stats" ON public.site_stats FOR ALL USING (true);

INSERT INTO public.site_stats (label, value, suffix, order_priority) VALUES
    ('Modelos exclusivos', 0, '+', 1),
    ('Clientes satisfeitos', 0, '+', 2),
    ('Estados atendidos', 0, '', 3),
    ('Camisas originais', 100, '%', 4)
ON CONFLICT DO NOTHING;

-- Product images (galeria de imagens por produto)
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt TEXT,
    is_primary BOOLEAN DEFAULT false,
    order_priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on product_images" ON public.product_images;
CREATE POLICY "Allow all on product_images" ON public.product_images FOR ALL USING (true);

-- Customer addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    cep TEXT NOT NULL,
    address TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on customer_addresses" ON public.customer_addresses;
CREATE POLICY "Allow all on customer_addresses" ON public.customer_addresses FOR ALL USING (true);

-- Size guide (guia de medidas)
CREATE TABLE IF NOT EXISTS public.size_guide (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    size TEXT NOT NULL,
    width_cm NUMERIC(5,1) NOT NULL,
    height_cm NUMERIC(5,1) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.size_guide ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on size_guide" ON public.size_guide;
CREATE POLICY "Allow all on size_guide" ON public.size_guide FOR ALL USING (true);

INSERT INTO public.size_guide (size, width_cm, height_cm) VALUES
    ('P', 50, 69),
    ('M', 52, 71),
    ('G', 54, 73),
    ('GG', 56, 75),
    ('XG', 58, 77)
ON CONFLICT DO NOTHING;

-- Create RPC to get site setting
CREATE OR REPLACE FUNCTION get_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value FROM public.site_settings WHERE key = p_key;
    RETURN v_value;
END;
$$;

-- Create RPC to update site stats from real data
CREATE OR REPLACE FUNCTION refresh_site_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.site_stats SET value = (SELECT COUNT(*) FROM public.products WHERE active IS NOT FALSE) WHERE label = 'Modelos exclusivos';
    UPDATE public.site_stats SET value = (SELECT COUNT(DISTINCT customer_email) FROM public.orders) WHERE label = 'Clientes satisfeitos';
    UPDATE public.site_stats SET value = (SELECT COUNT(DISTINCT SPLIT_PART(customer_address, 'CEP: ', 2)) FROM public.orders WHERE customer_address IS NOT NULL) WHERE label = 'Estados atendidos';
END;
$$;
