import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient<Database>(process.env.SUPABASE_URL!, key, {
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
        const [{ data: cats }, { data: prods }] = await Promise.all([
          sb.from("categories").select("slug"),
          sb.from("products").select("slug, updated_at").limit(5000),
        ]);

        const entries = [
          { path: "/", priority: "1.0", changefreq: "daily" as const },
          { path: "/busca", priority: "0.6", changefreq: "weekly" as const },
          ...(cats ?? []).map((c) => ({ path: `/categoria/${c.slug}`, priority: "0.7", changefreq: "daily" as const })),
          ...(prods ?? []).map((p) => ({
            path: `/produto/${p.slug}`,
            lastmod: p.updated_at,
            priority: "0.8",
            changefreq: "daily" as const,
          })),
        ];

        const urls = entries.map((e) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}${e.path}</loc>`,
            "lastmod" in e && e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
