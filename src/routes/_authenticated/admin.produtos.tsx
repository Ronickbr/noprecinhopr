import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListAllProducts, adminDeleteProduct } from "@/lib/products.functions";
import { toast } from "sonner";
import { Trash2, Search, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", applied, page],
    queryFn: () => adminListAllProducts({ data: { q: applied || undefined, page } }),
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); toast.success("Produto removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Buscar e moderar produtos do catálogo.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setApplied(q); setPage(1); }} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…" className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-card text-sm" />
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase font-mono tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Criado</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>
            ) : (data?.rows ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.image_url ? <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover border border-border" /> : <div className="h-10 w-10 rounded bg-muted" />}
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">/{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.brand ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link to="/produto/$slug" params={{ slug: p.slug }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> Ver
                    </Link>
                    <button onClick={() => { if (confirm(`Excluir "${p.name}"?`)) remove.mutate(p.id); }} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span>{data ? `${data.count.toLocaleString("pt-BR")} produtos` : ""}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3 rounded border border-border disabled:opacity-40">‹ Anterior</button>
          <span className="h-8 px-2 flex items-center">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3 rounded border border-border disabled:opacity-40">Próxima ›</button>
        </div>
      </div>
    </div>
  );
}
