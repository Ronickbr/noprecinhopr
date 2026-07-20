import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminOverviewStats } from "@/lib/products.functions";
import { Store, Package, Tag, Users, MousePointerClick, Layers, ShieldCheck, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => adminOverviewStats(), retry: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Visão geral</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas em tempo real da plataforma PrecinhoBom.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">Carregando métricas…</div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Store} label="Lojas" value={data.stores.total} hint={`${data.stores.approved} aprovadas · ${data.stores.pending} pendentes · ${data.stores.suspended} suspensas`} />
            <Stat icon={Package} label="Produtos" value={data.products} />
            <Stat icon={Layers} label="Ofertas" value={data.offers} />
            <Stat icon={Tag} label="Categorias" value={data.categories} />
            <Stat icon={Users} label="Usuários" value={data.users} hint={`${data.roles.admin ?? 0} admin · ${data.roles.merchant ?? 0} lojistas`} />
            <Stat icon={MousePointerClick} label="Cliques (30d)" value={data.clicks30d} />
            <Stat icon={ShieldCheck} label="Assinaturas ativas" value={(data.subscriptions.active ?? 0) + (data.subscriptions.trialing ?? 0)} hint={`${data.subscriptions.trialing ?? 0} em trial`} />
            <Stat icon={ShieldAlert} label="Inadimplentes / expiradas" value={(data.subscriptions.past_due ?? 0) + (data.subscriptions.expired ?? 0) + (data.subscriptions.canceled ?? 0)} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Panel title="Distribuição de assinaturas">
              <ul className="space-y-1 text-sm">
                {Object.entries(data.subscriptions).map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{k}</span>
                    <span className="font-mono">{v}</span>
                  </li>
                ))}
                {Object.keys(data.subscriptions).length === 0 ? (
                  <li className="text-xs text-muted-foreground">Sem assinaturas.</li>
                ) : null}
              </ul>
            </Panel>
            <Panel title="Papéis">
              <ul className="space-y-1 text-sm">
                {(["admin", "merchant", "user"] as const).map((r) => (
                  <li key={r} className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{r}</span>
                    <span className="font-mono">{data.roles[r] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-mono font-semibold text-foreground">{value.toLocaleString("pt-BR")}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
