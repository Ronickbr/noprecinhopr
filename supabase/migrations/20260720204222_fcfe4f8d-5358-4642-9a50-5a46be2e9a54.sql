
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Anyone can read public settings" ON public.site_settings;
CREATE POLICY "Anyone can read public settings"
  ON public.site_settings FOR SELECT
  USING (is_public = true);
