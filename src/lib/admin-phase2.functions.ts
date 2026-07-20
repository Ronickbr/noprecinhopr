import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

// ============ BRANDS ============
export const adminListBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string) => Promise<{ data: unknown }> } } })
      .from("brands").select("id, slug, name, logo_url, country, website, description, active, created_at").order("name");
    return (data ?? []) as Array<{ id: string; slug: string; name: string; logo_url: string | null; country: string | null; website: string | null; description: string | null; active: boolean; created_at: string }>;
  });

export const adminUpsertBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({
    id: z.string().uuid().optional(),
    slug: z.string().min(1),
    name: z.string().min(1),
    logo_url: z.string().url().nullable().optional(),
    country: z.string().nullable().optional(),
    website: z.string().url().nullable().optional(),
    description: z.string().nullable().optional(),
    active: z.boolean().default(true),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("brands").upsert(payload, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("brands").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ OFFERS ANALYTICS ============
export const adminOffersInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabaseAdmin as any;

    const since = new Date(Date.now() - 30 * 864e5).toISOString();

    const [{ data: offers }, { data: history }] = await Promise.all([
      sb.from("offers").select("id, product_id, store_id, price_cents, updated_at, expire_at").order("updated_at", { ascending: false }).limit(500),
      sb.from("price_history").select("offer_id, price_cents, changed_at").gte("changed_at", since).order("changed_at", { ascending: false }).limit(2000),
    ]);

    const productIds = Array.from(new Set(((offers ?? []) as Array<{ product_id: string }>).map((o) => o.product_id)));
    const storeIds = Array.from(new Set(((offers ?? []) as Array<{ store_id: string }>).map((o) => o.store_id)));

    const [{ data: products }, { data: stores }] = await Promise.all([
      productIds.length ? sb.from("products").select("id, name, slug").in("id", productIds) : Promise.resolve({ data: [] }),
      storeIds.length ? sb.from("stores").select("id, name, slug").in("id", storeIds) : Promise.resolve({ data: [] }),
    ]);

    const productMap = new Map(((products ?? []) as Array<{ id: string; name: string; slug: string }>).map((p) => [p.id, p]));
    const storeMap = new Map(((stores ?? []) as Array<{ id: string; name: string; slug: string }>).map((s) => [s.id, s]));

    // Compute change per offer from history
    const changesByOffer = new Map<string, { prev: number; latest: number }>();
    for (const h of (history ?? []) as Array<{ offer_id: string; price_cents: number }>) {
      const cur = changesByOffer.get(h.offer_id);
      if (!cur) changesByOffer.set(h.offer_id, { prev: h.price_cents, latest: h.price_cents });
      else changesByOffer.set(h.offer_id, { prev: h.price_cents, latest: cur.latest });
    }

    const enriched = ((offers ?? []) as Array<{ id: string; product_id: string; store_id: string; price_cents: number; updated_at: string; expire_at: string | null }>).map((o) => {
      const change = changesByOffer.get(o.id);
      const delta = change ? o.price_cents - change.prev : 0;
      const pct = change && change.prev ? (delta / change.prev) * 100 : 0;
      return {
        id: o.id,
        product: productMap.get(o.product_id) ?? { id: o.product_id, name: "?", slug: "" },
        store: storeMap.get(o.store_id) ?? { id: o.store_id, name: "?", slug: "" },
        price_cents: o.price_cents,
        prev_price_cents: change?.prev ?? null,
        delta_pct: pct,
        updated_at: o.updated_at,
        expire_at: o.expire_at,
      };
    });

    const topDrops = [...enriched].filter((x) => x.delta_pct < 0).sort((a, b) => a.delta_pct - b.delta_pct).slice(0, 20);
    const topRises = [...enriched].filter((x) => x.delta_pct > 0).sort((a, b) => b.delta_pct - a.delta_pct).slice(0, 20);
    const stale = [...enriched].sort((a, b) => a.updated_at.localeCompare(b.updated_at)).slice(0, 20);
    const expiring = enriched.filter((x) => x.expire_at && new Date(x.expire_at) > new Date()).sort((a, b) => (a.expire_at ?? "").localeCompare(b.expire_at ?? "")).slice(0, 20);

    return { topDrops, topRises, stale, expiring, total: enriched.length };
  });

// ============ APPROVAL REQUESTS ============
export const adminListApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabaseAdmin as any).from("approval_requests").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows } = await q;
    return (rows ?? []) as Array<{ id: string; kind: string; status: string; requester_id: string | null; target_id: string | null; payload: Record<string, unknown>; reviewer_id: string | null; reviewer_notes: string | null; reviewed_at: string | null; created_at: string }>;
  });

export const adminDecideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({
    id: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
    notes: z.string().optional(),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("approval_requests").update({
      status: data.decision,
      reviewer_id: context.userId,
      reviewer_notes: data.notes ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ REPORTS (denúncias) ============
export const adminListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ status: z.enum(["open", "reviewing", "resolved", "dismissed", "all"]).default("open") }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabaseAdmin as any).from("reports").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows } = await q;
    return (rows ?? []) as Array<{ id: string; target: string; target_id: string; reporter_id: string | null; reason: string; details: string | null; status: string; assignee_id: string | null; resolution_notes: string | null; resolved_at: string | null; created_at: string }>;
  });

export const adminUpdateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["open", "reviewing", "resolved", "dismissed"]).optional(),
    resolution_notes: z.string().optional(),
    assign_to_me: z.boolean().optional(),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.resolution_notes !== undefined) patch.resolution_notes = data.resolution_notes;
    if (data.assign_to_me) patch.assignee_id = context.userId;
    if (data.status === "resolved" || data.status === "dismissed") patch.resolved_at = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("reports").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
