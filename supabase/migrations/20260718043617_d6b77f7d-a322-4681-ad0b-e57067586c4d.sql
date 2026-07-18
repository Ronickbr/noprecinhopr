
-- Merchant subscription plans
CREATE TYPE public.subscription_status AS ENUM ('trialing','active','past_due','canceled','expired');

CREATE TABLE public.merchant_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  max_products INTEGER,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merchant_plans TO anon, authenticated;
GRANT ALL ON public.merchant_plans TO service_role;
ALTER TABLE public.merchant_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are public" ON public.merchant_plans FOR SELECT USING (is_active = true);

CREATE TRIGGER trg_merchant_plans_updated BEFORE UPDATE ON public.merchant_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.merchant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.merchant_plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  provider TEXT,
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.merchant_subscriptions TO authenticated;
GRANT ALL ON public.merchant_subscriptions TO service_role;
ALTER TABLE public.merchant_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.merchant_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own subscription" ON public.merchant_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subscription" ON public.merchant_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_merchant_subs_updated BEFORE UPDATE ON public.merchant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the 3 tiers
INSERT INTO public.merchant_plans (slug, name, price_cents, max_products, features, sort_order) VALUES
  ('starter', 'Starter', 4900, 50, '["Até 50 produtos ativos","Painel de gestão","Estatísticas básicas"]'::jsonb, 1),
  ('pro', 'Pro', 14900, 500, '["Até 500 produtos ativos","Destaque na busca","Estatísticas avançadas","Suporte prioritário"]'::jsonb, 2),
  ('enterprise', 'Enterprise', 39900, NULL, '["Produtos ilimitados","Acesso à API","Gerente dedicado","SLA 99.9%"]'::jsonb, 3);
