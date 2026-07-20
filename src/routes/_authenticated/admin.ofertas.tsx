import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { adminOffersInsights } from "@/lib/admin-phase2.functions";
import { PageHeader } from "@/components/admin/ui";
import { TrendingDown, TrendingUp, Clock, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/ofertas")({
  component: OffersPage,
});

type Row = {
  id: string;
  product: { id: string; name: string; slug: string };
  store: { id: string; name: string; slug: string };
  price_cents: number;
  prev_price_cents: number | null;
  delta_pct: number;
  updated_at: string;
  expire_at: string | null;
};

const fmt = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rel = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days < 1) return "hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
};

function OffersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-offers-insights"], queryFn: () => adminOffersInsights() });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ofertas"
        description="Comparativo de preços — maiores quedas, aumentos, sem atualização e validade próxima."
      />

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Carregando insights…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Maiores quedas de preço" icon={TrendingDown} accent="text-success" rows={data?.topDrops ?? []} kind="delta" />
          <Panel title="Aumentos de preço" icon={TrendingUp} accent="text-destructive" rows={data?.topRises ?? []} kind="delta" />
          <Panel title="Sem atualização recente" icon={Clock} accent="text-muted-foreground" rows={data?.stale ?? []} kind="stale" />
          <Panel title="Ofertas com validade" icon={CalendarClock} accent="text-highlight" rows={data?.expiring ?? []} kind="expire" />
        </div>
      )}
    </div>
  );
}

function Panel({ title, icon: Icon, accent, rows, kind }: { title: string; icon: React.ComponentType<{ className?: string }>; accent: string; rows: Row[]; kind: "delta" | "stale" | "expire" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Icon className={`h-4 w-4 ${accent}`} />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto text-[11px] font-mono text-muted-foreground">{rows.length}</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.length === 0 ? (
          <li className="p-6 text-center text-xs text-muted-foreground">Sem dados neste critério.</li>
        ) : rows.slice(0, 10).map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/20">
            <div className="min-w-0 flex-1">
              <Link to="/produto/$slug" params={{ slug: r.product.slug }} className="block truncate font-medium hover:underline">
                {r.product.name}
              </Link>
              <div className="text-xs text-muted-foreground truncate">
                {r.store.slug ? (
                  <Link to="/loja/$slug" params={{ slug: r.store.slug }} className="hover:underline">{r.store.name}</Link>
                ) : r.store.name}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">{fmt(r.price_cents)}</div>
              {kind === "delta" && r.prev_price_cents != null && (
                <div className={`text-[11px] font-mono ${r.delta_pct < 0 ? "text-success" : "text-destructive"}`}>
                  {r.delta_pct > 0 ? "+" : ""}{r.delta_pct.toFixed(1)}%
                </div>
              )}
              {kind === "stale" && <div className="text-[11px] font-mono text-muted-foreground">há {rel(r.updated_at)}</div>}
              {kind === "expire" && r.expire_at && <div className="text-[11px] font-mono text-highlight">até {new Date(r.expire_at).toLocaleDateString("pt-BR")}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
