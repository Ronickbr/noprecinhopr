import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "merchant" | "user";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRoles(u: User | null) {
      if (!u) {
        if (!cancelled) setRoles([]);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id);
      if (!cancelled) setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      setUser(data.user);
      await loadRoles(data.user);
      if (!cancelled) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      if (cancelled) return;
      setUser(u);
      await loadRoles(u);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const isMerchant = roles.includes("merchant");
  const primaryRole: AppRole = isAdmin ? "admin" : isMerchant ? "merchant" : "user";

  return { user, loading, roles, isAdmin, isMerchant, primaryRole };
}
