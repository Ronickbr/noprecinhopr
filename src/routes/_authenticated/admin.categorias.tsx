import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListCategories, adminUpsertCategory, adminDeleteCategory } from "@/lib/products.functions";
import { toast } from "sonner";
import { Trash2, Plus, Save } from "lucide-react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: CategoriesPage,
});

type Cat = { id: string; slug: string; name: string; parent_id: string | null; sort_order: number };

function CategoriesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-categories"], queryFn: () => adminListCategories(), retry: false });
  const { confirm, dialog } = useConfirm();

  const upsert = useMutation({
    mutationFn: (vars: { id?: string; slug: string; name: string; parent_id: string | null; sort_order: number }) =>
      adminUpsertCategory({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); toast.success("Categoria salva"); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteCategory({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); toast.success("Categoria removida"); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const [draft, setDraft] = useState({ slug: "", name: "", parent_id: "", sort_order: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Categorias</h1>
        <p className="mt-1 text-sm text-muted-foreground">Criar, editar e ordenar categorias do catálogo.</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Nova categoria</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_80px_auto]">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome" className="h-9 px-2 rounded border border-input bg-background text-sm" />
          <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="slug-url" className="h-9 px-2 rounded border border-input bg-background text-sm font-mono" />
          <select value={draft.parent_id} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })} className="h-9 px-2 rounded border border-input bg-background text-sm">
            <option value="">(sem pai)</option>
            {(data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} className="h-9 px-2 rounded border border-input bg-background text-sm font-mono" />
          <button
            onClick={() => {
              if (!draft.name.trim() || !draft.slug.trim()) { toast.error("Nome e slug são obrigatórios"); return; }
              upsert.mutate({ ...draft, parent_id: draft.parent_id || null }, {
                onSuccess: () => setDraft({ slug: "", name: "", parent_id: "", sort_order: 0 }),
              });
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase font-mono tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Pai</th>
              <th className="px-4 py-3 font-medium">Ordem</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>
            ) : (data ?? []).map((c) => (
              <CategoryRow
                key={c.id}
                cat={c}
                all={data ?? []}
                onSave={(v) => upsert.mutate(v)}
                onDelete={async () => {
                  const ok = await confirm({ title: `Remover "${c.name}"?`, description: "Produtos e subcategorias vinculados podem ser afetados.", confirmLabel: "Remover", destructive: true });
                  if (ok) remove.mutate(c.id);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      {dialog}
    </div>
  );
}

function CategoryRow({ cat, all, onSave, onDelete }: { cat: Cat; all: Cat[]; onSave: (v: { id: string; slug: string; name: string; parent_id: string | null; sort_order: number }) => void; onDelete: () => void }) {
  const [row, setRow] = useState({ name: cat.name, slug: cat.slug, parent_id: cat.parent_id ?? "", sort_order: cat.sort_order });
  return (
    <tr>
      <td className="px-4 py-2"><input value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} className="w-full h-8 px-2 rounded border border-input bg-background text-sm" /></td>
      <td className="px-4 py-2"><input value={row.slug} onChange={(e) => setRow({ ...row, slug: e.target.value })} className="w-full h-8 px-2 rounded border border-input bg-background text-sm font-mono" /></td>
      <td className="px-4 py-2">
        <select value={row.parent_id} onChange={(e) => setRow({ ...row, parent_id: e.target.value })} className="w-full h-8 px-2 rounded border border-input bg-background text-sm">
          <option value="">—</option>
          {all.filter((x) => x.id !== cat.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </td>
      <td className="px-4 py-2"><input type="number" value={row.sort_order} onChange={(e) => setRow({ ...row, sort_order: Number(e.target.value) })} className="w-20 h-8 px-2 rounded border border-input bg-background text-sm font-mono" /></td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <button onClick={() => onSave({ id: cat.id, ...row, parent_id: row.parent_id || null })} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
          <button onClick={onDelete} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        </div>
      </td>
    </tr>
  );
}
