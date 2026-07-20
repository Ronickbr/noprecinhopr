import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminFinanceSummary, type FinanceSummary } from "@/lib/admin-phase4.functions";
import { formatBRL } from "@/lib/format";
import { Wallet, Users, TrendingDown, RefreshCcw, DollarSign, CalendarClock, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const q = useQuery({
    queryKey: ["admin", "finance"],
    queryFn: () => adminFinanceSummary(),
  });
  const d = q.data;

  const planCols: Column<FinanceSummary["by_plan"][number]>[] = [
    { key: "plan_name", header: "Plano", cell: (r) => <span className="font-medium">{r.plan_name}</span> },
    { key: "price_cents", header: "Preço/mês", align: "right", cell: (r) => <span className="font-mono">{formatBRL(r.price_cents / 100)}</span> },
    { key: "active", header: "Assinantes", align: "right", cell: (r) => <span className="font-mono">{r.active}</span> },
    { key: "mrr_cents", header: "MRR", align: "right", cell: (r) => <span className="font-mono text-success">{formatBRL(r.mrr_cents / 100)}</span> },
  ];
  const renewCols: Column<FinanceSummary["upcoming_renewals"][number]>[] = [
    { key: "user_name", header: "Cliente", cell: (r) => <span>{r.user_name}</span> },
    { key: "plan_name", header: "Plano", cell: (r) => <span>{r.plan_name}</span> },
    { key: "price_cents", header: "Valor", align: "right", cell: (r) => <span className="font-mono">{formatBRL(r.price_cents / 100)}</span> },
    { key: "renew_at", header: "Renova em", align: "right", cell: (r) => <span className="font-mono text-xs">{new Date(r.renew_at).toLocaleDateString("pt-BR")}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="MRR, ARR, churn, receita por plano e renovações."
        actions={
          <button onClick={() => q.refetch()} className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-3 py-1.5 text-xs font-medium hover:bg-card/60">
            <RefreshCcw className="h-3.5 w-3.5" /> Atualizar
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={d ? formatBRL(d.mrr_cents / 100) : "—"} icon={DollarSign} accent="success" hint="Receita recorrente mensal" />
        <StatCard label="ARR" value={d ? formatBRL(d.arr_cents / 100) : "—"} icon={Wallet} accent="primary" hint="Projeção anualizada" />
        <StatCard label="Assinantes ativos" value={d?.active_subs ?? "—"} icon={Users} accent="highlight" hint={d ? `${d.trial_subs} em trial` : ""} />
        <StatCard label="Churn (30d)" value={d ? `${d.churn_rate}%` : "—"} icon={TrendingDown} accent="destructive" hint={d ? `${d.canceled_last_30d} cancelamentos` : ""} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Evolução de MRR (6 meses)</h3>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">R$ / mês</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={d?.mrr_trend ?? []}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => formatBRL(Number(v) / 100)}
                />
                <Area type="monotone" dataKey="mrr_cents" stroke="hsl(var(--success))" fill="url(#mrrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Novos vs Cancelados</h3>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">assinantes</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={d?.mrr_trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="new_subs" name="Novos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="churned" name="Cancelados" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Receita por plano</h3>
          <DataTable rows={d?.by_plan ?? []} columns={planCols} isLoading={q.isLoading} getRowId={(r: FinanceSummary["by_plan"][number]) => r.plan_id} emptyMessage="Sem assinaturas ativas." />
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><CalendarClock className="h-4 w-4" /> Renovações próximas (30d)</h3>
          <DataTable rows={d?.upcoming_renewals ?? []} columns={renewCols} isLoading={q.isLoading} getRowId={(r: FinanceSummary["upcoming_renewals"][number]) => r.id} emptyMessage="Nenhuma renovação nos próximos 30 dias." />
        </div>
      </div>
    </div>
  );
}
