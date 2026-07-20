import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListReports, adminUpdateReport } from "@/lib/admin-phase2.functions";
import { PageHeader } from "@/components/admin/ui";
import { toast } from "sonner";
import { AlertTriangle, UserCheck, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/denuncias")({
  component: ReportsPage,
});

const targetLabel = { product: "Produto", store: "Loja", user: "Usuário", offer: "Oferta" } as const;

function ReportsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"open" | "reviewing" | "resolved" | "dismissed" | "all">("open");
  const { data, isLoading } = useQuery({ queryKey: ["admin-reports", status], queryFn: () => adminListReports({ data: { status } }) });

  const update = useMutation({
    mutationFn: (v: { id: string; status?: "open" | "reviewing" | "resolved" | "dismissed"; resolution_notes?: string; assign_to_me?: boolean }) => adminUpdateReport({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Denúncia atualizada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Denúncias" description="Fila de denúncias contra produtos, lojas, ofertas e usuários." />

      <div className="inline-flex flex-wrap rounded-lg border border-border bg-card p-1 text-xs font-mono uppercase">
        {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-md ${status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {s === "open" ? "Abertas" : s === "reviewing" ? "Em análise" : s === "resolved" ? "Resolvidas" : s === "dismissed" ? "Descartadas" : "Todas"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-card divide-y divide-border">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">Carregando…</div>
        ) : (data ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma denúncia neste filtro.</div>
        ) : (data ?? []).map((r) => (
          <div key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{targetLabel[r.target as keyof typeof targetLabel] ?? r.target}</span>
                  <code className="text-[11px] font-mono text-muted-foreground">{r.target_id.slice(0, 8)}</code>
                  <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-mono ${
                    r.status === "open" ? "bg-destructive/10 text-destructive" :
                    r.status === "reviewing" ? "bg-highlight/10 text-highlight" :
                    r.status === "resolved" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>{r.status.toUpperCase()}</span>
                  <span className="ml-auto text-[11px] font-mono text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <p className="mt-2 text-sm">{r.reason}</p>
                {r.details && <p className="mt-1 text-xs text-muted-foreground">{r.details}</p>}
                {r.resolution_notes && (
                  <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
                    <span className="text-muted-foreground">Resolução: </span>{r.resolution_notes}
                  </div>
                )}
                <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                  Denunciante: {r.reporter_id?.slice(0, 8) ?? "—"} · Responsável: {r.assignee_id?.slice(0, 8) ?? "—"}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {r.status === "open" && (
                <button onClick={() => update.mutate({ id: r.id, status: "reviewing", assign_to_me: true })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-highlight/10 text-highlight text-xs font-medium hover:bg-highlight/20">
                  <UserCheck className="h-3.5 w-3.5" /> Assumir
                </button>
              )}
              {(r.status === "open" || r.status === "reviewing") && (
                <>
                  <button onClick={() => {
                    const notes = prompt("Nota de resolução:") ?? "";
                    update.mutate({ id: r.id, status: "resolved", resolution_notes: notes });
                  }} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolver
                  </button>
                  <button onClick={() => update.mutate({ id: r.id, status: "dismissed", resolution_notes: "Descartada" })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/70">
                    <XCircle className="h-3.5 w-3.5" /> Descartar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
