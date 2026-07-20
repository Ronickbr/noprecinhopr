
-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity, entity_id);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_id);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger helper: capture changes on critical tables
CREATE OR REPLACE FUNCTION public.log_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eid TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    eid := OLD.id::text;
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, metadata)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, eid, to_jsonb(OLD));
    RETURN OLD;
  ELSE
    eid := NEW.id::text;
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, metadata)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, eid,
      jsonb_build_object('new', to_jsonb(NEW)) ||
      CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD)) ELSE '{}'::jsonb END);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER stores_audit AFTER INSERT OR UPDATE OR DELETE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
CREATE TRIGGER offers_audit AFTER INSERT OR UPDATE OR DELETE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
CREATE TRIGGER user_roles_audit AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

-- ============ SITE SETTINGS ============
CREATE TABLE public.site_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public settings" ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.site_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (key, value) VALUES
  ('general', '{"site_name":"PrecinhoBom","tagline":"Compare precos em tempo real","support_email":"contato@precinhobom.com.br"}'::jsonb),
  ('seo', '{"default_title":"PrecinhoBom - Compare precos","default_description":"Compare precos de milhares de lojas em um so lugar."}'::jsonb),
  ('social', '{"instagram":"","twitter":"","facebook":"","youtube":""}'::jsonb),
  ('analytics', '{"ga_id":"","gtm_id":"","meta_pixel":""}'::jsonb),
  ('legal', '{"privacy_url":"","terms_url":"","lgpd_contact":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
