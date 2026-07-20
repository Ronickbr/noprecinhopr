import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminListAuditLogs } from "@/lib/admin-phase3.functions";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: LogsPage,
});

type Row = Awaited<ReturnType<typeof adminListAuditLogs>>[number];

const ACTIONS = ["", "INSERT", "UPDATE", "DELETE"];
const ENTITIES = ["", "stores", "products", "offers", "user_roles"];

function actionBadge(a: string) {
  const map: Record<string, string> = {
    INSERT: "bg-success/15 text-success",
    UPDATE: "bg-highlight/15 text-highlight",
    DELETE: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${map[a] ?? "bg-muted text-muted-foreground"}`}>
      {a}
    </span>
  );
}

function LogsPage() {
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "audit-logs", entity, action, q],
    queryFn: () => adminListAuditLogs({
      data: {
        entity: entity || undefined,
        action: action || undefined,
        q: q || undefined,
        limit: 200,
      },
    }),
  });

  const columns: Column<Row>[] = [
    {
      key: "created_at", header: "Quando", width: "160px",
      cell: (r) => <span className="font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>,
    },
    { key: "action", header: "Ação", width: "90px", cell: (r) => actionBadge(r.action) },
    { key: "entity", header: "Entidade", width: "120px", cell: (r) => <span className="font-mono text-xs">{r.entity}</span> },
    { key: "entity_id", header: "ID", cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.entity_id?.slice(0, 8) ?? "—"}</span> },
    { key: "actor", header: "Autor", cell: (r) => <span className="text-sm">{r.actor_name}</span> },
    {
      key: "detail", header: "", align: "right", width: "80px",
      cell: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(expanded === r.id ? null : r.id); }}
          className="text-xs text-primary hover:underline"
        >{expanded === r.id ? "ocultar" : "detalhes"}</button>
      ),
    },
  ];

  const selected = query.data?.find((r) => r.id === expanded);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs do sistema"
        description="Auditoria de todas as alterações em lojas, produtos, ofertas e papéis."
      />

      <DataTable
        rows={query.data}
        columns={columns}
        isLoading={query.isLoading}
        getRowId={(r) => r.id}
        toolbar={
          <>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs">
              {ENTITIES.map((v) => <option key={v} value={v}>{v || "todas entidades"}</option>)}
            </select>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs">
              {ACTIONS.map((v) => <option key={v} value={v}>{v || "todas ações"}</option>)}
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar por ID…"
              className="h-8 flex-1 min-w-[180px] rounded-md border border-border/60 bg-background px-2.5 text-xs"
            />
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {query.data?.length ?? 0} registros
            </span>
          </>
        }
      />

      {selected && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Metadata</p>
            <button onClick={() => setExpanded(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">fechar</button>
          </div>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify(JSON.parse(selected.metadata as unknown as string), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
