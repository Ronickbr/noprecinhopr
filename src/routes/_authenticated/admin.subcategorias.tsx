import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListCategories } from "@/lib/products.functions";
import { PageHeader } from "@/components/admin/ui";
import { FolderTree, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/subcategorias")({
  component: SubcategoriesPage,
});

function SubcategoriesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-categories"], queryFn: () => adminListCategories() });
  const cats = data ?? [];
  const parents = cats.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subcategorias"
        description="Visão em árvore das subcategorias por categoria pai. Edite em Categorias."
        actions={
          <Link to="/admin/categorias" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-sm font-medium hover:bg-muted">
            Gerenciar categorias <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">Carregando…</div>
      ) : parents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {parents.map((p) => {
            const kids = childrenOf(p.id);
            return (
              <div key={p.id} className="rounded-xl border border-border/60 bg-card">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <FolderTree className="h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground truncate">{p.slug}</div>
                  </div>
                  <span className="ml-auto text-[11px] font-mono text-muted-foreground">{kids.length}</span>
                </div>
                {kids.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground">Sem subcategorias.</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {kids.map((k) => (
                      <li key={k.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                        <span className="truncate">{k.name}</span>
                        <code className="ml-auto text-[11px] font-mono text-muted-foreground">{k.slug}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
