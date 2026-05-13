-- Migration 005: move legacy local asset paths (/jersey, /logos) to Supabase Storage public URLs
-- Run this in Supabase SQL Editor after uploading files to bucket `jersey-images`.

BEGIN;

-- Ensure bucket exists and is public.
INSERT INTO storage.buckets (id, name, public)
VALUES ('jersey-images', 'jersey-images', true)
ON CONFLICT (id) DO NOTHING;

DO $do$
DECLARE
  project_url TEXT := 'https://cuysmgukyikxdwsladeo.supabase.co';
  bucket_name TEXT := 'jersey-images';
BEGIN
  -- products.image_url
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'image_url'
  ) THEN
    EXECUTE format(
      $sql$
      UPDATE public.products
      SET image_url = %L || '/storage/v1/object/public/' || %L || '/' || ltrim(image_url, '/')
      WHERE image_url IS NOT NULL
        AND image_url !~* '^https?://'
        AND image_url ~* '^/?(jersey|logos)/';
      $sql$,
      project_url,
      bucket_name
    );
  END IF;

  -- product_images.url
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_images' AND column_name = 'url'
  ) THEN
    EXECUTE format(
      $sql$
      UPDATE public.product_images
      SET url = %L || '/storage/v1/object/public/' || %L || '/' || ltrim(url, '/')
      WHERE url IS NOT NULL
        AND url !~* '^https?://'
        AND url ~* '^/?(jersey|logos)/';
      $sql$,
      project_url,
      bucket_name
    );
  END IF;

  -- leagues.logo_url
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leagues' AND column_name = 'logo_url'
  ) THEN
    EXECUTE format(
      $sql$
      UPDATE public.leagues
      SET logo_url = %L || '/storage/v1/object/public/' || %L || '/' || ltrim(logo_url, '/')
      WHERE logo_url IS NOT NULL
        AND logo_url !~* '^https?://'
        AND logo_url ~* '^/?(jersey|logos)/';
      $sql$,
      project_url,
      bucket_name
    );
  END IF;

  -- teams.logo_url
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'logo_url'
  ) THEN
    EXECUTE format(
      $sql$
      UPDATE public.teams
      SET logo_url = %L || '/storage/v1/object/public/' || %L || '/' || ltrim(logo_url, '/')
      WHERE logo_url IS NOT NULL
        AND logo_url !~* '^https?://'
        AND logo_url ~* '^/?(jersey|logos)/';
      $sql$,
      project_url,
      bucket_name
    );
  END IF;

  -- testimonials.avatar_url
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'testimonials' AND column_name = 'avatar_url'
  ) THEN
    EXECUTE format(
      $sql$
      UPDATE public.testimonials
      SET avatar_url = %L || '/storage/v1/object/public/' || %L || '/' || ltrim(avatar_url, '/')
      WHERE avatar_url IS NOT NULL
        AND avatar_url !~* '^https?://'
        AND avatar_url ~* '^/?(jersey|logos)/';
      $sql$,
      project_url,
      bucket_name
    );
  END IF;
END
$do$;

COMMIT;
