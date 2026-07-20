import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListAllProducts, adminDeleteProduct, adminListCategories } from "@/lib/products.functions";
import { toast } from "sonner";
import { PageHeader, SearchInput } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Trash2, ExternalLink, Package } from "lucide-react";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: ProductsPage,
});

type Row = NonNullable<Awaited<ReturnType<typeof adminListAllProducts>>>["rows"][number];

function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>("");
  const [sort, setSort] = useState<"recent" | "oldest" | "name_asc" | "name_desc">("recent");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", applied, page, category, sort],
    queryFn: () => adminListAllProducts({ data: { q: applied || undefined, page, categorySlug: category || undefined, sort } }),
    retry: false,
  });
  const { data: cats } = useQuery({ queryKey: ["admin-cats"], queryFn: () => adminListCategories(), retry: false });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); toast.success("Produto removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<Row>[] = [
    {
      key: "product",
      header: "Produto",
      cell: (p) => (
        <div className="flex items-center gap-3">
          {p.image_url ? (
            <img src={p.image_url} alt="" className="h-11 w-11 rounded-md border border-border/60 object-cover" />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-md bg-muted text-muted-foreground">
              <Package className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{p.name}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">/{p.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "brand", header: "Marca", cell: (p) => <span className="text-sm text-muted-foreground">{p.brand ?? "—"}</span> },
    { key: "created", header: "Cadastro", cell: (p) => <span className="font-mono text-[11px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span> },
    { key: "actions", header: "", align: "right", cell: (p) => (
      <div className="flex justify-end gap-2">
        <Link to="/produto/$slug" params={{ slug: p.slug }} className="inline-flex h-7 items-center gap-1 rounded-md border border-border/60 px-2 text-xs hover:bg-accent">
          <ExternalLink className="h-3 w-3" /> Ver
        </Link>
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir "${p.name}"?`)) remove.mutate(p.id); }}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-destructive/10 px-2 text-xs text-destructive hover:bg-destructive/20"
        >
          <Trash2 className="h-3 w-3" /> Excluir
        </button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos" description="Buscar, filtrar e moderar o catálogo global." />

      <DataTable
        rows={data?.rows}
        columns={cols}
        isLoading={isLoading}
        getRowId={(p) => p.id}
        page={page}
        pageSize={data?.pageSize}
        total={data?.count}
        onPageChange={setPage}
        emptyMessage="Nenhum produto encontrado."
        toolbar={
          <>
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Buscar produto por nome…"
              onSubmit={() => { setApplied(q); setPage(1); }}
              className="w-full sm:w-80"
            />
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-border/60 bg-card px-2 text-sm"
            >
              <option value="">Todas categorias</option>
              {(cats ?? []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as typeof sort); setPage(1); }}
              className="h-9 rounded-md border border-border/60 bg-card px-2 text-sm"
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="name_asc">Nome A-Z</option>
              <option value="name_desc">Nome Z-A</option>
            </select>
          </>
        }
      />
    </div>
  );
}

// Reference to keep import used symbolically
formatBRL;
