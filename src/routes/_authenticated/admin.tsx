import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListStores, adminSetStoreStatus } from "@/lib/products.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — PrecinhoBom" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => adminListStores(),
    retry: false,
  });
  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: "pending" | "approved" | "suspended" }) =>
      adminSetStoreStatus({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-stores"] });
      toast.success("Atualizado");
    },
  });

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        Você não tem acesso ao painel de administração.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Administração de lojas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aprove ou suspenda lojas cadastradas.</p>
        </div>
        <a
          href="/admin/lojistas"
          className="text-xs font-mono uppercase tracking-widest text-primary hover:underline"
        >
          Monitorar lojistas →
        </a>
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Confiança</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>
            ) : (
              data?.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">/{s.slug}</p>
                  </td>
                  <td className="px-4 py-3">{Number(s.trust_score).toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${s.status === "approved" ? "bg-success/15 text-success" : s.status === "suspended" ? "bg-destructive/15 text-destructive" : "bg-muted"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {s.status !== "approved" ? (
                      <button
                        onClick={() => setStatus.mutate({ id: s.id, status: "approved" })}
                        className="text-primary hover:underline text-xs"
                      >
                        Aprovar
                      </button>
                    ) : null}
                    {s.status !== "suspended" ? (
                      <button
                        onClick={() => setStatus.mutate({ id: s.id, status: "suspended" })}
                        className="text-destructive hover:underline text-xs"
                      >
                        Suspender
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
