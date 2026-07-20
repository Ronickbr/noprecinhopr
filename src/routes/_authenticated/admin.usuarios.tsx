import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminListUsers, adminGrantRole } from "@/lib/products.functions";
import { toast } from "sonner";
import { Search, ShieldPlus, ShieldMinus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => adminListUsers(), retry: false });
  const [q, setQ] = useState("");

  const grant = useMutation({
    mutationFn: (vars: { user_id: string; role: "admin" | "merchant" | "user"; action: "grant" | "revoke" }) => adminGrantRole({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Papel atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((u) => (u.display_name ?? "").toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s) || u.id.includes(s));
  }, [data, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pesquisar contas e gerenciar papéis.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, email ou ID…" className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-card text-sm" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase font-mono tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Papéis</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.display_name ?? "(sem nome)"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{u.id}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{u.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 ? <span className="text-xs text-muted-foreground">user</span> : u.roles.map((r) => (
                      <span key={r} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${r === "admin" ? "bg-primary/10 text-primary" : r === "merchant" ? "bg-success/10 text-success" : "bg-muted"}`}>{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {(["admin", "merchant"] as const).map((role) => {
                      const has = u.roles.includes(role);
                      return (
                        <button
                          key={role}
                          onClick={() => grant.mutate({ user_id: u.id, role, action: has ? "revoke" : "grant" })}
                          className={`inline-flex items-center gap-1 text-xs ${has ? "text-destructive" : "text-primary"} hover:underline`}
                        >
                          {has ? <ShieldMinus className="h-3.5 w-3.5" /> : <ShieldPlus className="h-3.5 w-3.5" />}
                          {has ? `Revogar ${role}` : `Tornar ${role}`}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">Nenhum usuário encontrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
