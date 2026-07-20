import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

// ============ FINANCIAL DASHBOARD ============
export type FinanceSummary = {
  mrr_cents: number;
  arr_cents: number;
  active_subs: number;
  trial_subs: number;
  canceled_last_30d: number;
  churn_rate: number;
  by_plan: Array<{ plan_id: string; plan_name: string; price_cents: number; active: number; mrr_cents: number }>;
  mrr_trend: Array<{ month: string; mrr_cents: number; new_subs: number; churned: number }>;
  upcoming_renewals: Array<{ id: string; user_name: string; plan_name: string; price_cents: number; renew_at: string }>;
};

export const adminFinanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FinanceSummary> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const { data: plans } = await db.from("merchant_plans").select("id, name, price_cents");
    const planMap = new Map<string, { name: string; price_cents: number }>(
      ((plans ?? []) as Array<{ id: string; name: string; price_cents: number }>).map((p) => [p.id, { name: p.name, price_cents: p.price_cents }]),
    );

    const { data: subs } = await db
      .from("merchant_subscriptions")
      .select("id, user_id, plan_id, status, trial_ends_at, current_period_end, canceled_at, created_at");

    const now = Date.now();
    const d30 = now - 30 * 86400_000;
    let mrr = 0;
    let active = 0;
    let trial = 0;
    let canceled30 = 0;
    const byPlan = new Map<string, { active: number; mrr: number }>();

    const list = (subs ?? []) as Array<{ id: string; user_id: string; plan_id: string; status: string; trial_ends_at: string | null; current_period_end: string | null; canceled_at: string | null; created_at: string }>;
    for (const s of list) {
      const price = planMap.get(s.plan_id)?.price_cents ?? 0;
      if (s.status === "active") {
        active++;
        mrr += price;
        const cur = byPlan.get(s.plan_id) ?? { active: 0, mrr: 0 };
        cur.active++; cur.mrr += price;
        byPlan.set(s.plan_id, cur);
      } else if (s.status === "trialing") {
        trial++;
      }
      if (s.canceled_at && new Date(s.canceled_at).getTime() >= d30) canceled30++;
    }
    const churn = active + canceled30 > 0 ? (canceled30 / (active + canceled30)) * 100 : 0;

    // MRR trend last 6 months (approximation: count active-at-time subs)
    const trend: Array<{ month: string; mrr_cents: number; new_subs: number; churned: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      let mMrr = 0, mNew = 0, mChurn = 0;
      for (const s of list) {
        const created = new Date(s.created_at).getTime();
        const canceled = s.canceled_at ? new Date(s.canceled_at).getTime() : null;
        const activeInMonth = created < monthEnd && (canceled === null || canceled >= monthStart) && s.status !== "trialing";
        if (activeInMonth) mMrr += planMap.get(s.plan_id)?.price_cents ?? 0;
        if (created >= monthStart && created < monthEnd) mNew++;
        if (canceled && canceled >= monthStart && canceled < monthEnd) mChurn++;
      }
      trend.push({ month: monthKey, mrr_cents: mMrr, new_subs: mNew, churned: mChurn });
    }

    // upcoming renewals next 30 days
    const upcomingRaw = list
      .filter((s) => s.status === "active" && s.current_period_end && new Date(s.current_period_end).getTime() < now + 30 * 86400_000)
      .sort((a, b) => new Date(a.current_period_end!).getTime() - new Date(b.current_period_end!).getTime())
      .slice(0, 20);

    const userIds = Array.from(new Set(upcomingRaw.map((s) => s.user_id)));
    let nameMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await db.from("profiles").select("id, display_name").in("id", userIds);
      nameMap = new Map(((profs ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name ?? p.id.slice(0, 8)]));
    }

    return {
      mrr_cents: mrr,
      arr_cents: mrr * 12,
      active_subs: active,
      trial_subs: trial,
      canceled_last_30d: canceled30,
      churn_rate: Math.round(churn * 100) / 100,
      by_plan: Array.from(byPlan.entries()).map(([id, v]) => ({
        plan_id: id,
        plan_name: planMap.get(id)?.name ?? "—",
        price_cents: planMap.get(id)?.price_cents ?? 0,
        active: v.active,
        mrr_cents: v.mrr,
      })).sort((a, b) => b.mrr_cents - a.mrr_cents),
      mrr_trend: trend,
      upcoming_renewals: upcomingRaw.map((s) => ({
        id: s.id,
        user_name: nameMap.get(s.user_id) ?? s.user_id.slice(0, 8),
        plan_name: planMap.get(s.plan_id)?.name ?? "—",
        price_cents: planMap.get(s.plan_id)?.price_cents ?? 0,
        renew_at: s.current_period_end!,
      })),
    };
  });

// ============ REGIONS (Paraná) ============
export type RegionSummary = {
  total_stores: number;
  cities_covered: number;
  by_state: Array<{ state: string; count: number }>;
  by_city: Array<{ city: string; state: string; stores: number; products: number; clicks_30d: number }>;
  uncategorized: number;
};

export const adminRegionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegionSummary> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const { data: stores } = await db.from("stores").select("id, city, state, status");
    const s = (stores ?? []) as Array<{ id: string; city: string | null; state: string | null; status: string }>;
    const byState = new Map<string, number>();
    const byCity = new Map<string, { city: string; state: string; stores: number }>();
    let uncat = 0;
    for (const st of s) {
      const state = st.state ?? "—";
      byState.set(state, (byState.get(state) ?? 0) + 1);
      if (!st.city) { uncat++; continue; }
      const key = `${state}::${st.city}`;
      const cur = byCity.get(key) ?? { city: st.city, state, stores: 0 };
      cur.stores++;
      byCity.set(key, cur);
    }

    // offers count per store owner via offers join
    const { data: offers } = await db.from("offers").select("store_id");
    const offerCount = new Map<string, number>();
    for (const o of ((offers ?? []) as Array<{ store_id: string }>)) {
      offerCount.set(o.store_id, (offerCount.get(o.store_id) ?? 0) + 1);
    }
    const storeCityMap = new Map<string, string>();
    for (const st of s) if (st.city) storeCityMap.set(st.id, `${st.state ?? "—"}::${st.city}`);

    const cityProducts = new Map<string, number>();
    for (const [storeId, cnt] of offerCount) {
      const key = storeCityMap.get(storeId);
      if (key) cityProducts.set(key, (cityProducts.get(key) ?? 0) + cnt);
    }

    // clicks 30d per city via offers join
    const d30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: clicks } = await db.from("clicks").select("offer_id, created_at").gte("created_at", d30);
    const { data: offers2 } = await db.from("offers").select("id, store_id");
    const offerStore = new Map<string, string>(((offers2 ?? []) as Array<{ id: string; store_id: string }>).map((o) => [o.id, o.store_id]));
    const cityClicks = new Map<string, number>();
    for (const c of ((clicks ?? []) as Array<{ offer_id: string }>)) {
      const sid = offerStore.get(c.offer_id);
      if (!sid) continue;
      const key = storeCityMap.get(sid);
      if (key) cityClicks.set(key, (cityClicks.get(key) ?? 0) + 1);
    }

    return {
      total_stores: s.length,
      cities_covered: byCity.size,
      by_state: Array.from(byState.entries()).map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count),
      by_city: Array.from(byCity.values()).map((c) => ({
        ...c,
        products: cityProducts.get(`${c.state}::${c.city}`) ?? 0,
        clicks_30d: cityClicks.get(`${c.state}::${c.city}`) ?? 0,
      })).sort((a, b) => b.stores - a.stores),
      uncategorized: uncat,
    };
  });

export const adminUpdateStoreLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      store_id: z.string().uuid(),
      city: z.string().min(1).max(120),
      state: z.string().min(2).max(2),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("stores").update({ city: data.city, state: data.state.toUpperCase() }).eq("id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
