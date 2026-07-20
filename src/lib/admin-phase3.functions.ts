import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

// ============ AUDIT LOGS ============
export const adminListAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      entity: z.string().optional(),
      action: z.string().optional(),
      actor_id: z.string().uuid().optional(),
      q: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabaseAdmin as any)
      .from("audit_logs")
      .select("id, actor_id, action, entity, entity_id, metadata, ip, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.entity) q = q.eq("entity", data.entity);
    if (data.action) q = q.eq("action", data.action);
    if (data.actor_id) q = q.eq("actor_id", data.actor_id);
    if (data.q) q = q.ilike("entity_id", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const actorIds = Array.from(
      new Set(((rows ?? []) as Array<{ actor_id: string | null }>).map((r) => r.actor_id).filter(Boolean) as string[]),
    );
    let actorMap = new Map<string, string>();
    if (actorIds.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profs } = await (supabaseAdmin as any)
        .from("profiles").select("id, display_name").in("id", actorIds);
      actorMap = new Map(((profs ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name ?? p.id.slice(0, 8)]));
    }

    return ((rows ?? []) as Array<{ id: string; actor_id: string | null; action: string; entity: string; entity_id: string | null; metadata: unknown; ip: string | null; created_at: string }>).map((r) => ({
      ...r,
      metadata: JSON.stringify(r.metadata ?? {}),
      actor_name: r.actor_id ? actorMap.get(r.actor_id) ?? r.actor_id.slice(0, 8) : "sistema",
    }));
  });

// ============ SITE SETTINGS ============
export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Array<{ key: string; value_json: string }>> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any).from("site_settings").select("key, value");
    return ((data ?? []) as Array<{ key: string; value: unknown }>).map((r) => ({
      key: r.key,
      value_json: JSON.stringify(r.value ?? {}),
    }));
  });


export const adminUpdateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      key: z.string().min(1),
      value: z.record(z.string(), z.unknown()),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("site_settings")
      .upsert({ key: data.key, value: data.value, updated_by: context.userId }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ADVANCED REPORTS ============
export const adminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabaseAdmin as any;
    const since = new Date(Date.now() - data.days * 864e5).toISOString();

    const [{ data: clicks }, { data: stores }, { data: products }, { data: offers }, { data: subs }, { data: plans }] = await Promise.all([
      sb.from("clicks").select("offer_id, created_at").gte("created_at", since).limit(10000),
      sb.from("stores").select("id, name, slug, status, trust_score, created_at"),
      sb.from("products").select("id, name, slug, category_id, brand_id"),
      sb.from("offers").select("id, product_id, store_id, price_cents"),
      sb.from("merchant_subscriptions").select("id, store_id, plan_id, status, current_period_end"),
      sb.from("merchant_plans").select("id, slug, name, price_cents"),
    ]);

    const offerMap = new Map(
      ((offers ?? []) as Array<{ id: string; product_id: string; store_id: string; price_cents: number }>).map((o) => [o.id, o]),
    );
    const storeMap = new Map(
      ((stores ?? []) as Array<{ id: string; name: string; slug: string }>).map((s) => [s.id, s]),
    );
    const productMap = new Map(
      ((products ?? []) as Array<{ id: string; name: string; slug: string; category_id: string | null }>).map((p) => [p.id, p]),
    );
    const planMap = new Map(
      ((plans ?? []) as Array<{ id: string; name: string; price_cents: number }>).map((p) => [p.id, p]),
    );

    // Aggregate clicks
    const clicksByStore = new Map<string, number>();
    const clicksByProduct = new Map<string, number>();
    const clicksByDay = new Map<string, number>();
    for (const c of (clicks ?? []) as Array<{ offer_id: string; created_at: string }>) {
      const o = offerMap.get(c.offer_id);
      if (o) {
        clicksByStore.set(o.store_id, (clicksByStore.get(o.store_id) ?? 0) + 1);
        clicksByProduct.set(o.product_id, (clicksByProduct.get(o.product_id) ?? 0) + 1);
      }
      const d = c.created_at.slice(0, 10);
      clicksByDay.set(d, (clicksByDay.get(d) ?? 0) + 1);
    }

    const topStores = [...clicksByStore.entries()]
      .map(([id, count]) => ({ ...(storeMap.get(id) ?? { id, name: "?", slug: "" }), count }))
      .sort((a, b) => b.count - a.count).slice(0, 20);
    const topProducts = [...clicksByProduct.entries()]
      .map(([id, count]) => ({ ...(productMap.get(id) ?? { id, name: "?", slug: "" }), count }))
      .sort((a, b) => b.count - a.count).slice(0, 20);

    // Store × offers count
    const offersByStore = new Map<string, number>();
    for (const o of (offers ?? []) as Array<{ store_id: string }>) {
      offersByStore.set(o.store_id, (offersByStore.get(o.store_id) ?? 0) + 1);
    }

    // MRR (active/trialing subs)
    let mrrCents = 0;
    const subsByStatus: Record<string, number> = {};
    for (const s of (subs ?? []) as Array<{ status: string; plan_id: string }>) {
      subsByStatus[s.status] = (subsByStatus[s.status] ?? 0) + 1;
      if (s.status === "active") {
        const plan = planMap.get(s.plan_id);
        if (plan) mrrCents += plan.price_cents;
      }
    }

    // Daily series
    const series: Array<{ day: string; clicks: number }> = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      series.push({ day: d, clicks: clicksByDay.get(d) ?? 0 });
    }

    return {
      totals: {
        stores: (stores ?? []).length,
        products: (products ?? []).length,
        offers: (offers ?? []).length,
        clicks: (clicks ?? []).length,
        mrr_cents: mrrCents,
      },
      topStores,
      topProducts,
      offersByStore: [...offersByStore.entries()].map(([id, count]) => ({
        ...(storeMap.get(id) ?? { id, name: "?", slug: "" }), count,
      })).sort((a, b) => b.count - a.count).slice(0, 20),
      subsByStatus,
      series,
    };
  });

// ============ PERMISSIONS MATRIX ============
export const adminRoleCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any).from("user_roles").select("role");
    const counts: Record<string, number> = {};
    for (const r of ((data ?? []) as Array<{ role: string }>)) {
      counts[r.role] = (counts[r.role] ?? 0) + 1;
    }
    return counts;
  });
