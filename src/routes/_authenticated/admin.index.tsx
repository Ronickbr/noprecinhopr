import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminOverviewStats } from "@/lib/products.functions";
import { adminGrowthStats, adminTopProducts, adminTopStores, adminLatestActivity } from "@/lib/admin.functions";
import { PageHeader, StatCard, Section, StatusBadge } from "@/components/admin/ui";
import {
  Store, Package, Users, MousePointerClick, Layers, Tag, TrendingUp,
  ShieldCheck, ShieldAlert, AlertTriangle, DollarSign,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => adminOverviewStats(), retry: false });
  const { data: growth } = useQuery({ queryKey: ["admin-growth"], queryFn: () => adminGrowthStats(), retry: false });
  const { data: topProducts } = useQuery({ queryKey: ["admin-top-products"], queryFn: () => adminTopProducts(), retry: false });
  const { data: topStores } = useQuery({ queryKey: ["admin-top-stores"], queryFn: () => adminTopStores(), retry: false });
  const { data: latest } = useQuery({ queryKey: ["admin-latest"], queryFn: () => adminLatestActivity(), retry: false });

  const activeSubs = (stats?.subscriptions.active ?? 0) + (stats?.subscriptions.trialing ?? 0);
  const problemSubs = (stats?.subscriptions.past_due ?? 0) + (stats?.subscriptions.expired ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Panorama em tempo real da plataforma PrecinhoBom."
        actions={
          <Link to="/admin/relatorios" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Relatórios detalhados
          </Link>
        }
      />

      {/* Alerts strip */}
      {problemSubs > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span><strong className="font-mono">{problemSubs}</strong> assinatura(s) inadimplente(s) ou expirada(s) — revise em Lojas.</span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Store} label="Lojas" value={stats?.stores.total ?? 0} hint={`${stats?.stores.approved ?? 0} aprovadas · ${stats?.stores.pending ?? 0} pendentes`} accent="primary" />
        <StatCard icon={Package} label="Produtos" value={stats?.products ?? 0} accent="primary" />
        <StatCard icon={Layers} label="Ofertas ativas" value={stats?.offers ?? 0} accent="success" />
        <StatCard icon={Tag} label="Categorias" value={stats?.categories ?? 0} />
        <StatCard icon={Users} label="Usuários" value={stats?.users ?? 0} hint={`${stats?.roles.admin ?? 0} admin · ${stats?.roles.merchant ?? 0} lojistas`} />
        <StatCard icon={MousePointerClick} label="Cliques (30d)" value={stats?.clicks30d ?? 0} accent="success" />
        <StatCard icon={ShieldCheck} label="Assinaturas ativas" value={activeSubs} hint={`${stats?.subscriptions.trialing ?? 0} em trial`} accent="success" />
        <StatCard icon={ShieldAlert} label="Problemas" value={problemSubs} accent={problemSubs > 0 ? "destructive" : undefined} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Crescimento (30 dias)" description="Novas lojas e cliques por dia">
          <div className="h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gStores" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={30} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="stores" stroke="var(--color-primary)" fill="url(#gStores)" strokeWidth={2} />
                <Area type="monotone" dataKey="clicks" stroke="var(--color-success)" fill="url(#gClicks)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Novos produtos por dia" description="Últimos 30 dias">
          <div className="h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={30} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="products" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Lists */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Produtos mais buscados" description="Últimos 30 dias">
          <ul className="divide-y divide-border/60 -mx-1">
            {(topProducts ?? []).length === 0 ? (
              <li className="py-4 text-xs text-muted-foreground">Sem dados ainda.</li>
            ) : (topProducts ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-1 py-2.5">
                {p.image_url ? <img src={p.image_url} alt="" className="h-9 w-9 rounded object-cover border border-border/60" /> : <div className="h-9 w-9 rounded bg-muted" />}
                <Link to="/produto/$slug" params={{ slug: p.slug }} className="min-w-0 flex-1 truncate text-sm hover:text-primary">
                  {p.name}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">{p.count}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Lojas mais acessadas" description="Últimos 30 dias">
          <ul className="divide-y divide-border/60 -mx-1">
            {(topStores ?? []).length === 0 ? (
              <li className="py-4 text-xs text-muted-foreground">Sem dados ainda.</li>
            ) : (topStores ?? []).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-1 py-2.5">
                {s.logo_url ? <img src={s.logo_url} alt="" className="h-9 w-9 rounded object-cover border border-border/60" /> : <div className="h-9 w-9 rounded bg-muted" />}
                <Link to="/loja/$slug" params={{ slug: s.slug }} className="min-w-0 flex-1 truncate text-sm hover:text-primary">
                  {s.name}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">{s.count}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Últimos cadastros" description="Lojas e usuários">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Lojas</p>
              <ul className="divide-y divide-border/60">
                {(latest?.stores ?? []).slice(0, 4).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0 truncate">{s.name}</span>
                    <StatusBadge status={s.status as string} />
                  </li>
                ))}
                {(latest?.stores ?? []).length === 0 && <li className="py-2 text-xs text-muted-foreground">—</li>}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Usuários</p>
              <ul className="divide-y divide-border/60">
                {(latest?.users ?? []).slice(0, 4).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0 truncate">{u.display_name ?? "(sem nome)"}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</span>
                  </li>
                ))}
                {(latest?.users ?? []).length === 0 && <li className="py-2 text-xs text-muted-foreground">—</li>}
              </ul>
            </div>
          </div>
        </Section>
      </div>

      {/* Financial teaser */}
      <Section title="Financeiro" description="MRR estimado baseado em assinaturas ativas" actions={<span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">em breve</span>}>
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-success/10 text-success">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">R$ —</p>
            <p className="text-xs text-muted-foreground">Cálculo completo disponível na próxima fase.</p>
          </div>
        </div>
      </Section>

      {statsLoading && <p className="text-center text-xs text-muted-foreground">Carregando métricas…</p>}
    </div>
  );
}
