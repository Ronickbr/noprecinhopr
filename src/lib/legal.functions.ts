import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public: LGPD contact e-mail (from site_settings.lgpd_contact)
export const getLgpdContact = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from("site_settings")
    .select("value")
    .eq("key", "lgpd_contact")
    .maybeSingle();
  const raw = data?.value;
  let email: string | null = null;
  if (typeof raw === "string") email = raw;
  else if (raw && typeof raw === "object") {
    const v = (raw as Record<string, unknown>).value ?? (raw as Record<string, unknown>).email;
    if (typeof v === "string") email = v;
  }
  return { email: email && /.+@.+\..+/.test(email) ? email : null };
});

// Authenticated: user requests own account deletion (LGPD art. 18)
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabaseAdmin as any;
    const uid = context.userId;
    // Best-effort cleanup of owned rows (RLS cascades most; profile has FK on cascade)
    await sb.from("favorites").delete().eq("user_id", uid);
    await sb.from("price_alerts").delete().eq("user_id", uid);
    // Remove auth user (cascades profiles, user_roles via FK ON DELETE CASCADE)
    const { error } = await sb.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
