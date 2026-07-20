import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListStores, adminSetStoreStatus, adminDeleteStore, adminSetTrustScore,
  adminListMerchants, adminSetSubscription, adminGrantRole, listMerchantPlansForAdmin,
} from "@/lib/products.functions";
import { toast } from "sonner";
import { PageHeader, SearchInput, SideSheet, StatusBadge, Section } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Star, Trash2, ExternalLink, ShieldCheck, ShieldX } from "lucide-react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/admin/lojas")({
  component: LojasPage,
});

type Merchant = NonNullable<Awaited<ReturnType<typeof adminListMerchants>>>["rows"][number];

function LojasPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "suspended">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Merchant | null>(null);
  const { confirm, dialog } = useConfirm();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-merchants", applied, statusFilter, page],
    queryFn: () => adminListMerchants({ data: { q: applied || undefined, status: statusFilter, page } }),
    retry: false,
  });
  const { data: plans } = useQuery({ queryKey: ["admin-plans"], queryFn: () => listMerchantPlansForAdmin(), retry: false });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-merchants"] });

  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: "pending" | "approved" | "suspended" }) => adminSetStoreStatus({ data: vars }),
    onSuccess: () => { invalidate(); toast.success("Status atualizado"); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteStore({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Loja excluída"); setSelected(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const setTrust = useMutation({
    mutationFn: (vars: { id: string; trust_score: number }) => adminSetTrustScore({ data: vars }),
    onSuccess: () => { invalidate(); toast.success("Confiança atualizada"); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const setSub = useMutation({
    mutationFn: (vars: { user_id: string; plan_id: string | null; status: "trialing" | "active" | "canceled" | "past_due" | "expired" }) => adminSetSubscription({ data: vars }),
    onSuccess: () => { invalidate(); toast.success("Assinatura atualizada"); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const grantRole = useMutation({
    mutationFn: (vars: { user_id: string; role: "admin" | "merchant" | "user"; action: "grant" | "revoke" }) => adminGrantRole({ data: vars }),
    onSuccess: () => { invalidate(); toast.success("Papel atualizado"); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const cols: Column<Merchant>[] = [
    {
      key: "name",
      header: "Loja",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-muted text-xs font-mono text-muted-foreground">
            {m.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{m.name}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">/{m.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "owner", header: "Lojista", cell: (m) => <span className="text-sm">{m.owner?.display_name ?? "—"}</span> },
    { key: "plan", header: "Plano", cell: (m) => <span className="text-xs font-mono">{m.subscription?.plan?.name ?? "—"}</span> },
    { key: "offers", header: "Produtos", align: "right", cell: (m) => <span className="tabular-nums">{m.offers_count}</span> },
    { key: "clicks", header: "Cliques 30d", align: "right", cell: (m) => <span className="tabular-nums">{m.clicks_30d}</span> },
    { key: "trust", header: "Confiança", cell: (m) => <span className="inline-flex items-center gap-1 text-xs"><Star className="h-3 w-3 text-highlight" />{m.trust_score.toFixed(1)}</span> },
    { key: "status", header: "Status", cell: (m) => <StatusBadge status={m.status as string} /> },
    { key: "created", header: "Cadastro", cell: (m) => <span className="font-mono text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString("pt-BR")}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Lojas" description="Aprove, suspenda, ajuste confiança e gerencie assinaturas." />

      <DataTable
        rows={data?.rows}
        columns={cols}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        getRowId={(m) => m.id}
        onRowClick={(m) => setSelected(m)}
        page={page}
        pageSize={data?.pageSize}
        total={data?.count}
        onPageChange={setPage}
        emptyMessage="Nenhuma loja encontrada com estes filtros."
        emptyHint={applied || statusFilter !== "all" ? "Limpe filtros para ver todas as lojas." : undefined}
        toolbar={
          <>
            <SearchInput
              value={q}
              onChange={setQ}
              onSubmit={() => { setApplied(q); setPage(1); }}
              placeholder="Buscar por nome ou slug…"
              className="w-full sm:w-72"
            />
            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card p-0.5">
              {(["all", "approved", "pending", "suspended"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`h-7 rounded px-2.5 text-[11px] font-mono uppercase tracking-widest transition-colors ${
                    statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "todos" : s}
                </button>
              ))}
            </div>
          </>
        }
      />

      <SideSheet
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle={`/${selected?.slug}`}
        width="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status as string} />
              <Link to="/loja/$slug" params={{ slug: selected.slug }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Ver página pública
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricBox label="Produtos" value={selected.offers_count} />
              <MetricBox label="Cliques 30d" value={selected.clicks_30d} />
              <MetricBox label="Confiança" value={selected.trust_score.toFixed(1)} />
            </div>

            <Section title="Status e moderação">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStatus.mutate({ id: selected.id, status: "approved" })} className="inline-flex items-center gap-1 rounded-md bg-success/10 px-3 py-1.5 text-xs text-success hover:bg-success/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> Aprovar
                </button>
                <button onClick={() => setStatus.mutate({ id: selected.id, status: "pending" })} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                  Pendente
                </button>
                <button onClick={() => setStatus.mutate({ id: selected.id, status: "suspended" })} className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20">
                  <ShieldX className="h-3.5 w-3.5" /> Suspender
                </button>
              </div>
            </Section>

            <Section title="Score de confiança">
              <div className="flex items-center gap-2">
                <input
                  type="number" step="0.1" min={0} max={5}
                  defaultValue={selected.trust_score.toFixed(1)}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n)) setTrust.mutate({ id: selected.id, trust_score: Math.max(0, Math.min(5, n)) });
                  }}
                  className="h-9 w-24 rounded-md border border-border/60 bg-background px-2 font-mono text-sm"
                />
                <span className="text-xs text-muted-foreground">0.0 — 5.0</span>
              </div>
            </Section>

            {selected.owner && (
              <Section title="Assinatura & papéis" description={`Lojista: ${selected.owner.display_name ?? "(sem nome)"}`}>
                <SubscriptionEditor
                  plans={plans ?? []}
                  current={selected.subscription}
                  onSave={(vars) => setSub.mutate({ user_id: selected.owner!.id, ...vars })}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["admin", "merchant"] as const).map((role) => (
                    <div key={role} className="inline-flex items-center gap-1 rounded-md border border-border/60 p-0.5 text-xs">
                      <span className="px-2 font-mono">{role}</span>
                      <button className="rounded bg-success/10 px-2 py-0.5 text-success hover:bg-success/20" onClick={() => grantRole.mutate({ user_id: selected.owner!.id, role, action: "grant" })}>+</button>
                      <button className="rounded bg-destructive/10 px-2 py-0.5 text-destructive hover:bg-destructive/20" onClick={() => grantRole.mutate({ user_id: selected.owner!.id, role, action: "revoke" })}>−</button>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Zona de perigo">
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: `Excluir loja "${selected.name}"?`,
                    description: "Todas as ofertas dessa loja serão removidas. Esta ação é irreversível.",
                    confirmLabel: "Excluir loja",
                    destructive: true,
                  });
                  if (ok) remove.mutate(selected.id);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir loja permanentemente
              </button>
            </Section>
          </div>
        )}
      </SideSheet>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
    </div>
  );
}

function SubscriptionEditor({
  plans, current, onSave,
}: {
  plans: Array<{ id: string; slug: string; name: string }>;
  current: Merchant["subscription"];
  onSave: (vars: { plan_id: string | null; status: "trialing" | "active" | "canceled" | "past_due" | "expired" }) => void;
}) {
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<"trialing" | "active" | "canceled" | "past_due" | "expired">(
    (current?.status as "trialing" | "active" | "canceled" | "past_due" | "expired" | undefined) ?? "trialing",
  );
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Atual: <span className="font-mono text-foreground">{current?.plan?.name ?? "sem plano"}</span> · {current?.status ?? "—"}
      </p>
      <div className="flex flex-wrap gap-2">
        <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm">
          <option value="">Selecionar plano…</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm">
          <option value="trialing">trialing</option>
          <option value="active">active</option>
          <option value="canceled">canceled</option>
          <option value="past_due">past_due</option>
          <option value="expired">expired</option>
        </select>
        <button
          onClick={() => onSave({ plan_id: planId || null, status })}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

// Keep symbol referenced to avoid unused import when rearranged
adminListStores;
