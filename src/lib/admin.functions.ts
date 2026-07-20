import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

// Returns per-day counts of new stores and new products for the last N days.
export const adminGrowthStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 30 * 86400e3).toISOString();

    const [storesRes, productsRes, clicksRes] = await Promise.all([
      context.supabase.from("stores").select("created_at").gte("created_at", since),
      context.supabase.from("products").select("created_at").gte("created_at", since),
      context.supabase.from("clicks").select("created_at").gte("created_at", since),
    ]);

    const bucket = (rows: { created_at: string }[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) {
        const day = r.created_at.slice(0, 10);
        m.set(day, (m.get(day) ?? 0) + 1);
      }
      return m;
    };
    const stores = bucket(storesRes.data);
    const products = bucket(productsRes.data);
    const clicks = bucket(clicksRes.data);

    const days: { day: string; stores: number; products: number; clicks: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10);
      days.push({
        day: d,
        stores: stores.get(d) ?? 0,
        products: products.get(d) ?? 0,
        clicks: clicks.get(d) ?? 0,
      });
    }
    return days;
  });

// Top searched products (proxy: most-clicked in last 30 days).
export const adminTopProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 30 * 86400e3).toISOString();
    const { data } = await context.supabase
      .from("clicks")
      .select("offer_id, offers!inner(product_id, products(id, slug, name, image_url))")
      .gte("created_at", since)
      .limit(2000);

    const byProduct = new Map<string, { id: string; slug: string; name: string; image_url: string | null; count: number }>();
    for (const c of (data ?? []) as Array<{ offers: { products: { id: string; slug: string; name: string; image_url: string | null } | null } | null }>) {
      const p = c.offers?.products;
      if (!p) continue;
      const cur = byProduct.get(p.id);
      byProduct.set(p.id, { ...p, count: (cur?.count ?? 0) + 1 });
    }
    return [...byProduct.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  });

// Top accessed stores (last 30 days).
export const adminTopStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 30 * 86400e3).toISOString();
    const { data } = await context.supabase
      .from("clicks")
      .select("offer_id, offers!inner(store_id, stores(id, slug, name, logo_url))")
      .gte("created_at", since)
      .limit(2000);
    const byStore = new Map<string, { id: string; slug: string; name: string; logo_url: string | null; count: number }>();
    for (const c of (data ?? []) as Array<{ offers: { stores: { id: string; slug: string; name: string; logo_url: string | null } | null } | null }>) {
      const s = c.offers?.stores;
      if (!s) continue;
      const cur = byStore.get(s.id);
      byStore.set(s.id, { ...s, count: (cur?.count ?? 0) + 1 });
    }
    return [...byStore.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  });

// Latest registrations (users + stores).
export const adminLatestActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [stores, profiles] = await Promise.all([
      context.supabase.from("stores").select("id, slug, name, created_at, status").order("created_at", { ascending: false }).limit(8),
      context.supabase.from("profiles").select("id, display_name, created_at").order("created_at", { ascending: false }).limit(8),
    ]);
    return { stores: stores.data ?? [], users: profiles.data ?? [] };
  });
