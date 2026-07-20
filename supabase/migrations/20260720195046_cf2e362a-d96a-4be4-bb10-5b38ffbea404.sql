ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS state text DEFAULT 'PR';
CREATE INDEX IF NOT EXISTS stores_state_city_idx ON public.stores (state, city);