import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const offerId = url.searchParams.get("offer");
        if (!offerId) return new Response("missing offer", { status: 400 });

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

        const { data: offer } = await sb.from("offers").select("url").eq("id", offerId).maybeSingle();
        if (!offer?.url) return new Response("offer not found", { status: 404 });

        // best-effort click logging via admin (no user auth here); fire-and-forget
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("clicks").insert({
            offer_id: offerId,
            referrer: request.headers.get("referer"),
            user_agent: request.headers.get("user-agent"),
          });
        } catch {
          // ignore
        }

        return Response.redirect(offer.url, 302);
      },
    },
  },
});
