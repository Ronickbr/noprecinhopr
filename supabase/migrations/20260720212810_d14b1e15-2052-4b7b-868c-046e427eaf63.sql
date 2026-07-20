
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can log clicks" ON public.clicks;
CREATE POLICY "Anyone can log clicks"
  ON public.clicks FOR INSERT TO anon, authenticated
  WITH CHECK (offer_id IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));
