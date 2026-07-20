import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminListUsers, adminGrantRole } from "@/lib/products.functions";
import { toast } from "sonner";
import { PageHeader, SearchInput } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ShieldPlus, ShieldMinus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsersPage,
});

type User = NonNullable<Awaited<ReturnType<typeof adminListUsers>>>[number];

function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => adminListUsers(), retry: false });
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "merchant" | "user">("all");

  const grant = useMutation({
    mutationFn: (vars: { user_id: string; role: "admin" | "merchant" | "user"; action: "grant" | "revoke" }) => adminGrantRole({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Papel atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (roleFilter !== "all") {
      list = roleFilter === "user"
        ? list.filter((u) => !u.roles.includes("admin") && !u.roles.includes("merchant"))
        : list.filter((u) => u.roles.includes(roleFilter));
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((u) => (u.display_name ?? "").toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s) || u.id.includes(s));
    }
    return list;
  }, [data, q, roleFilter]);

  const cols: Column<User>[] = [
    {
      key: "user",
      header: "Usuário",
      cell: (u) => (
        <div>
          <p className="font-medium">{u.display_name ?? "(sem nome)"}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{u.id}</p>
        </div>
      ),
    },
    { key: "email", header: "Email", cell: (u) => <span className="font-mono text-xs">{u.email ?? "—"}</span> },
    {
      key: "roles",
      header: "Papéis",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.length === 0 ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">user</span>
          ) : u.roles.map((r) => (
            <span key={r} className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
              r === "admin" ? "bg-primary/12 text-primary"
              : r === "merchant" ? "bg-success/12 text-success"
              : "bg-muted text-muted-foreground"
            }`}>{r}</span>
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      cell: (u) => (
        <div className="flex flex-wrap gap-1.5">
          {(["admin", "merchant"] as const).map((role) => {
            const has = u.roles.includes(role);
            return (
              <button
                key={role}
                onClick={() => grant.mutate({ user_id: u.id, role, action: has ? "revoke" : "grant" })}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors ${
                  has
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                {has ? <ShieldMinus className="h-3 w-3" /> : <ShieldPlus className="h-3 w-3" />}
                {has ? `− ${role}` : `+ ${role}`}
              </button>
            );
          })}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" description="Pesquisar contas, gerenciar papéis e permissões." />
      <DataTable
        rows={filtered}
        columns={cols}
        isLoading={isLoading}
        getRowId={(u) => u.id}
        emptyMessage="Nenhum usuário encontrado."
        toolbar={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Nome, email ou ID…" className="w-full sm:w-72" />
            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card p-0.5">
              {(["all", "admin", "merchant", "user"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`h-7 rounded px-2.5 text-[11px] font-mono uppercase tracking-widest transition-colors ${
                    roleFilter === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "all" ? "todos" : r}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs font-mono text-muted-foreground">{filtered.length} de {data?.length ?? 0}</span>
          </>
        }
      />
    </div>
  );
}
