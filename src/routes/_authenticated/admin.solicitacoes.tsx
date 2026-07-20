import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListApprovals, adminDecideApproval } from "@/lib/admin-phase2.functions";
import { PageHeader } from "@/components/admin/ui";
import { toast } from "sonner";
import { Check, X, Store, Package, Tag, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/solicitacoes")({
  component: ApprovalsPage,
});

const kindIcon = { store: Store, product: Package, brand: Tag, category: Layers } as const;
const kindLabel = { store: "Loja", product: "Produto", brand: "Marca", category: "Categoria" } as const;

function ApprovalsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const { data, isLoading } = useQuery({ queryKey: ["admin-approvals", status], queryFn: () => adminListApprovals({ data: { status } }) });

  const decide = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected"; notes?: string }) => adminDecideApproval({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-approvals"] }); toast.success("Decisão registrada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Solicitações" description="Fila de aprovação para novas lojas, produtos, marcas e categorias." />

      <div className="inline-flex rounded-lg border border-border bg-card p-1 text-xs font-mono uppercase">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-md ${status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {s === "pending" ? "Pendentes" : s === "approved" ? "Aprovadas" : s === "rejected" ? "Rejeitadas" : "Todas"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-card divide-y divide-border">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">Carregando…</div>
        ) : (data ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma solicitação neste filtro.</div>
        ) : (data ?? []).map((r) => {
          const Icon = kindIcon[r.kind as keyof typeof kindIcon] ?? Layers;
          let payload: Record<string, unknown> = {};
          try { payload = JSON.parse(r.payload) as Record<string, unknown>; } catch { /* noop */ }
          return (
            <div key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{kindLabel[r.kind as keyof typeof kindLabel] ?? r.kind}</span>
                    <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-mono ${
                      r.status === "pending" ? "bg-highlight/10 text-highlight" :
                      r.status === "approved" ? "bg-success/10 text-success" :
                      "bg-destructive/10 text-destructive"
                    }`}>{r.status.toUpperCase()}</span>
                    <span className="text-[11px] font-mono text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Solicitante: <span className="font-mono">{r.requester_id?.slice(0, 8) ?? "—"}</span></div>
                  {Object.keys(payload).length > 0 && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted/40 p-2 text-[11px] font-mono text-muted-foreground">
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  )}
                  {r.reviewer_notes && (
                    <div className="mt-2 text-xs">
                      <span className="text-muted-foreground">Nota do revisor: </span>
                      <span>{r.reviewer_notes}</span>
                    </div>
                  )}
                </div>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const notes = prompt("Nota (opcional):") ?? undefined;
                      decide.mutate({ id: r.id, decision: "approved", notes });
                    }}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success/20"
                  >
                    <Check className="h-3.5 w-3.5" /> Aprovar
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt("Motivo da rejeição:") ?? undefined;
                      decide.mutate({ id: r.id, decision: "rejected", notes });
                    }}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20"
                  >
                    <X className="h-3.5 w-3.5" /> Rejeitar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
