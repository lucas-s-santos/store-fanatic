-- Store Fanatic: Schema Definitions

-- Extension for UUID if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category TEXT NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    sizes TEXT[] NOT NULL DEFAULT '{}',
    image_url TEXT,
    tech_specs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    total_amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- values: pendente, pago, enviado, cancelado
    payment_method TEXT NOT NULL,          -- values: pix, credit_card
    shipping_address JSONB NOT NULL,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: order_items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    size TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policies (Basic Configuration for RLS - Assuming open reads for products, owner reads for orders)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Product Policies
CREATE POLICY "Products are viewable by everyone." 
    ON public.products FOR SELECT USING (true);

-- Allow fully open inserts/updates/deletes for admin ease (or restrict to service role / admin)
CREATE POLICY "Allow all on products." 
    ON public.products FOR ALL USING (true);

-- Order Policies
CREATE POLICY "Users can insert their own orders." 
    ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own orders." 
    ON public.orders FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow all on orders for Admin
CREATE POLICY "Allow all on orders"
    ON public.orders FOR ALL USING (true);

-- Order Items Policies
CREATE POLICY "Users can insert their own order items." 
    ON public.order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own order items." 
    ON public.order_items FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
        )
    );

CREATE POLICY "Allow all on order_items"
    ON public.order_items FOR ALL USING (true);
