import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListMerchants } from "@/lib/products.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/lojistas")({
  head: () => ({
    meta: [
      { title: "Lojistas — Admin PrecinhoBom" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: AdminMerchantsPage,
});

function statusBadge(s: string) {
  const map: Record<string, string> = {
    approved: "bg-success/15 text-success",
    active: "bg-success/15 text-success",
    trialing: "bg-primary/15 text-primary",
    pending: "bg-muted text-muted-foreground",
    suspended: "bg-destructive/15 text-destructive",
    canceled: "bg-destructive/15 text-destructive",
    past_due: "bg-destructive/15 text-destructive",
    expired: "bg-destructive/15 text-destructive",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function AdminMerchantsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-merchants"],
    queryFn: () => adminListMerchants(),
    retry: false,
  });

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        Acesso restrito ao administrador.
      </div>
    );
  }

  const totalClicks = (data ?? []).reduce((s, m) => s + m.clicks_30d, 0);
  const totalOffers = (data ?? []).reduce((s, m) => s + m.offers_count, 0);
  const activeSubs = (data ?? []).filter(
    (m) => m.subscription && (m.subscription.status === "active" || m.subscription.status === "trialing"),
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Admin</p>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Monitoração de lojistas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral de assinaturas, catálogo e engajamento por loja.
          </p>
        </div>
        <Link
          to="/admin"
          className="text-xs font-mono uppercase tracking-widest text-primary hover:underline"
        >
          ← Lojas
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Lojas" value={String((data ?? []).length)} />
        <StatCard label="Assinaturas ativas" value={String(activeSubs)} />
        <StatCard label="Ofertas totais" value={String(totalOffers)} />
        <StatCard label="Cliques (30d)" value={String(totalClicks)} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase font-mono tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Loja / Dono</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Assinatura</th>
              <th className="px-4 py-3 font-medium">Trial/Renov.</th>
              <th className="px-4 py-3 font-medium text-right">Ofertas</th>
              <th className="px-4 py-3 font-medium text-right">Cliques 30d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            ) : (data ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Nenhum lojista cadastrado.
                </td>
              </tr>
            ) : (
              data?.map((m) => {
                const sub = m.subscription;
                const renew = sub?.status === "trialing" ? sub.trial_ends_at : sub?.current_period_end ?? null;
                return (
                  <tr key={m.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">/{m.slug}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.owner?.display_name ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusBadge(m.status)}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sub?.plan ? (
                        <div>
                          <p className="font-medium">{sub.plan.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {formatBRL(sub.plan.price_cents)}/mês
                            {sub.plan.max_products != null ? ` · até ${sub.plan.max_products}` : " · ilimitado"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusBadge(sub.status)}`}>
                          {sub.status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">sem plano</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {fmtDate(renew)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{m.offers_count}</td>
                    <td className="px-4 py-3 text-right font-mono">{m.clicks_30d}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold font-mono">{value}</p>
    </div>
  );
}
