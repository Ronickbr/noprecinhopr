
DROP POLICY IF EXISTS "Users insert own subscription" ON public.merchant_subscriptions;
DROP POLICY IF EXISTS "Users update own subscription" ON public.merchant_subscriptions;
DROP POLICY IF EXISTS "Users view own subscription" ON public.merchant_subscriptions;

CREATE POLICY "Users insert own subscription"
  ON public.merchant_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own subscription"
  ON public.merchant_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users view own subscription"
  ON public.merchant_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
