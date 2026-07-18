
-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Lock down SECURITY DEFINER functions: only allow needed roles / triggers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.track_price_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- Tighten "Anyone can log clicks" policy to only allow inserting future rows (still permissive for tracking)
-- Keeping USING true for public INSERT is intentional (click tracking), but add basic check
DROP POLICY IF EXISTS "Anyone can log clicks" ON public.clicks;
CREATE POLICY "Anyone can log clicks" ON public.clicks FOR INSERT
  WITH CHECK (offer_id IS NOT NULL);
