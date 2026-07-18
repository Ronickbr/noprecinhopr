import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// ------------ public server client (RLS as anon) ------------
function makePublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// ------------ HOME ------------
export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = makePublicClient();
  const [categories, latestDrops, featured] = await Promise.all([
    sb.from("categories").select("id, slug, name").order("sort_order").limit(8),
    sb.rpc as never, // placeholder to satisfy types; using simple query below
    null,
  ]);

  // Best-priced offer per product (top 12)
  const { data: featuredProducts } = await sb
    .from("products")
    .select("id, slug, name, brand, image_url, category_id")
    .order("created_at", { ascending: false })
    .limit(12);

  const productIds = (featuredProducts ?? []).map((p) => p.id);
  const { data: offers } = productIds.length
    ? await sb
        .from("offers")
        .select("product_id, price_cents, store_id")
        .in("product_id", productIds)
        .order("price_cents", { ascending: true })
    : { data: [] as { product_id: string; price_cents: number; store_id: string }[] };

  const bestByProduct = new Map<string, { price_cents: number; count: number }>();
  for (const o of offers ?? []) {
    const cur = bestByProduct.get(o.product_id);
    if (!cur) bestByProduct.set(o.product_id, { price_cents: o.price_cents, count: 1 });
    else bestByProduct.set(o.product_id, { price_cents: Math.min(cur.price_cents, o.price_cents), count: cur.count + 1 });
  }

  const products = (featuredProducts ?? []).map((p) => {
    const best = bestByProduct.get(p.id);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      image_url: p.image_url,
      best_price_cents: best?.price_cents ?? 0,
      offer_count: best?.count ?? 0,
    };
  });

  return {
    categories: categories.data ?? [],
    products,
  };
});

// ------------ SEARCH ------------
const searchInput = z.object({
  q: z.string().trim().min(0).max(120).default(""),
  categorySlug: z.string().max(80).optional().nullable(),
  minPrice: z.number().nonnegative().optional().nullable(),
  maxPrice: z.number().nonnegative().optional().nullable(),
  sort: z.enum(["price_asc", "price_desc", "recent"]).default("price_asc"),
  page: z.number().int().min(1).max(200).default(1),
});

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => searchInput.parse(raw))
  .handler(async ({ data }) => {
    const sb = makePublicClient();
    const PAGE_SIZE = 24;
    const from = (data.page - 1) * PAGE_SIZE;

    let categoryId: string | null = null;
    if (data.categorySlug) {
      const { data: cat } = await sb.from("categories").select("id").eq("slug", data.categorySlug).maybeSingle();
      categoryId = cat?.id ?? null;
    }

    let q = sb
      .from("products")
      .select("id, slug, name, brand, image_url, category_id", { count: "exact" });

    if (data.q) {
      // simple ilike search across name+brand — good enough for MVP; index handles TSV for future upgrade
      q = q.or(`name.ilike.%${data.q}%,brand.ilike.%${data.q}%`);
    }
    if (categoryId) q = q.eq("category_id", categoryId);

    q = q.range(from, from + PAGE_SIZE - 1).order("created_at", { ascending: false });

    const { data: prods, count } = await q;
    const ids = (prods ?? []).map((p) => p.id);

    const { data: offs } = ids.length
      ? await sb.from("offers").select("product_id, price_cents").in("product_id", ids)
      : { data: [] as { product_id: string; price_cents: number }[] };

    const bestByProduct = new Map<string, { price_cents: number; count: number }>();
    for (const o of offs ?? []) {
      const cur = bestByProduct.get(o.product_id);
      if (!cur) bestByProduct.set(o.product_id, { price_cents: o.price_cents, count: 1 });
      else bestByProduct.set(o.product_id, { price_cents: Math.min(cur.price_cents, o.price_cents), count: cur.count + 1 });
    }

    let items = (prods ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      image_url: p.image_url,
      best_price_cents: bestByProduct.get(p.id)?.price_cents ?? 0,
      offer_count: bestByProduct.get(p.id)?.count ?? 0,
    }));

    if (data.minPrice != null) items = items.filter((i) => i.best_price_cents >= data.minPrice! * 100);
    if (data.maxPrice != null) items = items.filter((i) => i.best_price_cents <= data.maxPrice! * 100);
    if (data.sort === "price_asc") items.sort((a, b) => a.best_price_cents - b.best_price_cents);
    if (data.sort === "price_desc") items.sort((a, b) => b.best_price_cents - a.best_price_cents);

    return {
      items,
      total: count ?? 0,
      page: data.page,
      pageSize: PAGE_SIZE,
    };
  });

// ------------ CATEGORIES LIST ------------
export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = makePublicClient();
  const { data } = await sb.from("categories").select("id, slug, name").order("sort_order");
  return data ?? [];
});

// ------------ PRODUCT DETAIL ------------
export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(raw))
  .handler(async ({ data }) => {
    const sb = makePublicClient();
    const { data: product } = await sb
      .from("products")
      .select("id, slug, name, brand, image_url, description, category_id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!product) return null;

    const { data: category } = product.category_id
      ? await sb.from("categories").select("slug, name").eq("id", product.category_id).maybeSingle()
      : { data: null };

    const { data: offers } = await sb
      .from("offers")
      .select("id, price_cents, url, in_stock, updated_at, store_id")
      .eq("product_id", product.id)
      .order("price_cents", { ascending: true });

    const storeIds = [...new Set((offers ?? []).map((o) => o.store_id))];
    const { data: stores } = storeIds.length
      ? await sb.from("stores").select("id, slug, name, logo_url, trust_score").in("id", storeIds)
      : { data: [] as { id: string; slug: string; name: string; logo_url: string | null; trust_score: number }[] };
    const storeMap = new Map(stores?.map((s) => [s.id, s]) ?? []);

    const offerIds = (offers ?? []).map((o) => o.id);
    const { data: history } = offerIds.length
      ? await sb
          .from("price_history")
          .select("offer_id, price_cents, captured_at")
          .in("offer_id", offerIds)
          .gte("captured_at", new Date(Date.now() - 90 * 86400e3).toISOString())
          .order("captured_at", { ascending: true })
      : { data: [] as { offer_id: string; price_cents: number; captured_at: string }[] };

    // Aggregate: min price per day across all offers
    const dayMin = new Map<string, number>();
    for (const h of history ?? []) {
      const day = h.captured_at.slice(0, 10);
      const cur = dayMin.get(day);
      if (cur == null || h.price_cents < cur) dayMin.set(day, h.price_cents);
    }
    const historyPoints = [...dayMin.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, price]) => ({ day, price_cents: price }));

    const lowest90d = historyPoints.length ? Math.min(...historyPoints.map((h) => h.price_cents)) : 0;
    const currentBest = offers?.length ? offers[0].price_cents : 0;

    return {
      product,
      category,
      offers: (offers ?? []).map((o) => ({
        ...o,
        store: storeMap.get(o.store_id) ?? null,
      })),
      history: historyPoints,
      stats: {
        current_best: currentBest,
        lowest_90d: lowest90d,
        is_lowest: currentBest > 0 && currentBest <= lowest90d,
      },
    };
  });

// ------------ FAVORITES (authenticated) ------------
export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("favorites")
      .select("product_id, products(id, slug, name, brand, image_url)")
      .eq("user_id", context.userId);
    return data ?? [];
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ productId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", context.userId)
      .eq("product_id", data.productId)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("favorites").delete().eq("user_id", context.userId).eq("product_id", data.productId);
      return { favorited: false };
    }
    await context.supabase.from("favorites").insert({ user_id: context.userId, product_id: data.productId });
    return { favorited: true };
  });

// ------------ PRICE ALERTS ------------
export const listAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("price_alerts")
      .select("id, target_price_cents, active, created_at, product_id, products(slug, name, image_url)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const createAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ productId: z.string().uuid(), targetPrice: z.number().positive().max(1_000_000) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("price_alerts").insert({
      user_id: context.userId,
      product_id: data.productId,
      target_price_cents: Math.round(data.targetPrice * 100),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await context.supabase.from("price_alerts").delete().eq("user_id", context.userId).eq("id", data.id);
    return { ok: true };
  });

// ------------ MERCHANT ------------
export const getMyStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("stores")
      .select("*")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    return data;
  });

export const upsertMyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug inválido"),
        description: z.string().max(500).optional().nullable(),
        logo_url: z.string().url().optional().nullable().or(z.literal("")),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // Grant merchant role
    await context.supabase.from("user_roles").insert({ user_id: context.userId, role: "merchant" }).select();

    const { data: existing } = await context.supabase
      .from("stores")
      .select("id")
      .eq("owner_user_id", context.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase
        .from("stores")
        .update({
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          logo_url: data.logo_url || null,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("stores").insert({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        logo_url: data.logo_url || null,
        owner_user_id: context.userId,
        status: "pending",
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

const catalogRow = z.object({
  sku: z.string().min(1).max(120),
  name: z.string().min(2).max(200),
  brand: z.string().max(80).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  price: z.number().positive().max(10_000_000),
  url: z.string().url().max(500),
  image: z.string().url().max(500).optional().nullable(),
});

export const uploadCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ rows: z.array(catalogRow).min(1).max(500) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id, status")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (!store) throw new Error("Cadastre sua loja antes de enviar o catálogo.");

    const { data: cats } = await context.supabase.from("categories").select("id, slug");
    const catMap = new Map((cats ?? []).map((c) => [c.slug, c.id]));

    let created = 0;
    let updated = 0;
    for (const row of data.rows) {
      const slug = row.sku
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-");

      const { data: prod, error: prodErr } = await context.supabase
        .from("products")
        .upsert(
          {
            slug,
            name: row.name,
            brand: row.brand ?? null,
            category_id: row.category ? catMap.get(row.category) ?? null : null,
            image_url: row.image ?? null,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();
      if (prodErr || !prod) continue;

      const { data: existingOffer } = await context.supabase
        .from("offers")
        .select("id")
        .eq("product_id", prod.id)
        .eq("store_id", store.id)
        .maybeSingle();

      if (existingOffer) {
        await context.supabase
          .from("offers")
          .update({ price_cents: Math.round(row.price * 100), url: row.url, in_stock: true })
          .eq("id", existingOffer.id);
        updated++;
      } else {
        await context.supabase.from("offers").insert({
          product_id: prod.id,
          store_id: store.id,
          price_cents: Math.round(row.price * 100),
          url: row.url,
          in_stock: true,
        });
        created++;
      }
    }
    return { created, updated };
  });

export const getStoreAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (!store) return { clicks: 0, offers: 0, topProducts: [] };

    const { count: offers } = await context.supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id);

    const since = new Date(Date.now() - 30 * 86400e3).toISOString();
    const { data: clickRows } = await context.supabase
      .from("clicks")
      .select("offer_id, offers!inner(product_id, store_id, products(name, slug))")
      .eq("offers.store_id", store.id)
      .gte("created_at", since);

    const byProduct = new Map<string, { name: string; slug: string; count: number }>();
    for (const c of clickRows ?? []) {
      const p = (c as { offers: { products: { name: string; slug: string } | null } }).offers?.products;
      if (!p) continue;
      const key = p.slug;
      const cur = byProduct.get(key);
      byProduct.set(key, { name: p.name, slug: p.slug, count: (cur?.count ?? 0) + 1 });
    }
    const topProducts = [...byProduct.values()].sort((a, b) => b.count - a.count).slice(0, 10);

    return { clicks: clickRows?.length ?? 0, offers: offers ?? 0, topProducts };
  });

// ------------ ADMIN ------------
export const adminListStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data } = await context.supabase
      .from("stores")
      .select("id, slug, name, status, trust_score, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminSetStoreStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "suspended"]) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    await context.supabase.from("stores").update({ status: data.status }).eq("id", data.id);
    return { ok: true };
  });
