import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminReports } from "@/lib/admin-phase3.functions";
import { formatBRL } from "@/lib/format";
import { BarChart3, Store, Package, MousePointerClick, Wallet, Download } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  component: RelatoriosPage,
});

const RANGES = [
  { d: 7, label: "7d" }, { d: 30, label: "30d" }, { d: 90, label: "90d" },
];

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function RelatoriosPage() {
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ["admin", "reports", days],
    queryFn: () => adminReports({ data: { days } }),
  });
  const d = q.data;

  const storeCols: Column<{ id: string; name: string; slug: string; count: number }>[] = [
    { key: "name", header: "Loja", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "count", header: "Cliques", align: "right", cell: (r) => <span className="font-mono">{r.count}</span> },
  ];
  const prodCols: Column<{ id: string; name: string; slug: string; count: number }>[] = [
    { key: "name", header: "Produto", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "count", header: "Cliques", align: "right", cell: (r) => <span className="font-mono">{r.count}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Rankings, tráfego e receita recorrente."
        actions={
          <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.d}
                onClick={() => setDays(r.d)}
                className={`h-7 rounded px-2.5 text-xs font-medium transition-colors ${
                  days === r.d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >{r.label}</button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Lojas" value={d?.totals.stores ?? 0} icon={Store} />
        <StatCard label="Produtos" value={d?.totals.products ?? 0} icon={Package} />
        <StatCard label="Ofertas" value={d?.totals.offers ?? 0} icon={BarChart3} />
        <StatCard label={`Cliques (${days}d)`} value={d?.totals.clicks ?? 0} icon={MousePointerClick} accent="highlight" />
        <StatCard label="MRR" value={d ? formatPrice(d.totals.mrr_cents) : "—"} icon={Wallet} accent="success" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Tráfego diário</p>
            <p className="mt-0.5 text-sm font-semibold">Cliques em ofertas</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d?.series ?? []}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable
          rows={d?.topStores}
          columns={storeCols}
          isLoading={q.isLoading}
          getRowId={(r) => r.id}
          toolbar={
            <>
              <p className="text-sm font-semibold">Top lojas por cliques</p>
              <button
                onClick={() => download(`top-lojas-${days}d.csv`, toCsv(d?.topStores ?? []))}
                className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 px-2.5 text-xs hover:bg-accent"
              ><Download className="h-3.5 w-3.5" /> CSV</button>
            </>
          }
        />
        <DataTable
          rows={d?.topProducts}
          columns={prodCols}
          isLoading={q.isLoading}
          getRowId={(r) => r.id}
          toolbar={
            <>
              <p className="text-sm font-semibold">Top produtos por cliques</p>
              <button
                onClick={() => download(`top-produtos-${days}d.csv`, toCsv(d?.topProducts ?? []))}
                className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 px-2.5 text-xs hover:bg-accent"
              ><Download className="h-3.5 w-3.5" /> CSV</button>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable
          rows={d?.offersByStore}
          columns={[
            { key: "name", header: "Loja", cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "count", header: "Ofertas", align: "right", cell: (r) => <span className="font-mono">{r.count}</span> },
          ]}
          isLoading={q.isLoading}
          getRowId={(r) => r.id}
          toolbar={<p className="text-sm font-semibold">Lojas por volume de ofertas</p>}
        />
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <p className="text-sm font-semibold">Assinaturas por status</p>
          <div className="mt-4 space-y-2">
            {Object.entries(d?.subsByStatus ?? {}).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{k}</span>
                <span className="font-semibold tabular-nums">{v}</span>
              </div>
            ))}
            {!d && <p className="text-xs text-muted-foreground">Carregando…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
