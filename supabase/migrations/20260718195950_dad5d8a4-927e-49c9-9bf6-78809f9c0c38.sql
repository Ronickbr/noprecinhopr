
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS secondary_banner_url text,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS featured_product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
