-- Migration 004: Fix schema compatibility - add missing columns

-- Add 'title' column (used by admin code alongside 'name')
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS title TEXT;
UPDATE public.products SET title = name WHERE title IS NULL;

-- Add 'stock' as alias for stock_quantity
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
UPDATE public.products SET stock = stock_quantity WHERE stock IS NULL;

-- Add 'active' column (referenced in refresh_site_stats)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('jersey-images', 'jersey-images', true)
ON CONFLICT (id) DO NOTHING;
