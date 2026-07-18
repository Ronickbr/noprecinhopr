import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIAL_DAYS = 30;

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("merchant_plans")
      .select("id, slug, name, price_cents, max_products, features, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("merchant_subscriptions")
      .select("*, plan:merchant_plans(id, slug, name, price_cents, max_products, features)")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data;
  });

export const subscribeToPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ plan_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: plan, error: pErr } = await context.supabase
      .from("merchant_plans")
      .select("id")
      .eq("id", data.plan_id)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr || !plan) throw new Error("Plano indisponível.");

    const { data: existing } = await context.supabase
      .from("merchant_subscriptions")
      .select("id, status, trial_ends_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 86400_000);
    const periodEnd = new Date(now.getTime() + (TRIAL_DAYS + 30) * 86400_000);

    if (existing) {
      // Already had a subscription — plan change, keep any prior trial usage
      const alreadyUsedTrial = !!existing.trial_ends_at;
      const { error } = await context.supabase
        .from("merchant_subscriptions")
        .update({
          plan_id: plan.id,
          status: alreadyUsedTrial ? "active" : "trialing",
          trial_ends_at: alreadyUsedTrial ? existing.trial_ends_at : trialEnd.toISOString(),
          current_period_end: periodEnd.toISOString(),
          canceled_at: null,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("merchant_subscriptions").insert({
        user_id: context.userId,
        plan_id: plan.id,
        status: "trialing",
        trial_ends_at: trialEnd.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true, trial_ends_at: trialEnd.toISOString() };
  });

export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("merchant_subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
