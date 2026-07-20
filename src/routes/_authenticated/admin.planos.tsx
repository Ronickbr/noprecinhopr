import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listMerchantPlansForAdmin, adminUpsertPlan, adminDeletePlan } from "@/lib/products.functions";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  component: PlansPage,
});

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  max_products: number | null;
  is_active: boolean;
  sort_order: number;
};

type FormState = {
  id?: string;
  slug: string;
  name: string;
  price_cents: number;
  max_products: string; // empty string = ilimitado
  is_active: boolean;
  sort_order: number;
};

const emptyForm: FormState = {
  slug: "",
  name: "",
  price_cents: 0,
  max_products: "",
  is_active: true,
  sort_order: 0,
};

function PlansPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-plans-view"], queryFn: () => listMerchantPlansForAdmin(), retry: false });
  const [editing, setEditing] = useState<FormState | null>(null);

  const upsert = useMutation({
    mutationFn: (form: FormState) =>
      adminUpsertPlan({
        data: {
          id: form.id,
          slug: form.slug.trim(),
          name: form.name.trim(),
          price_cents: Math.round(Number(form.price_cents) || 0),
          max_products: form.max_products === "" ? null : Math.max(0, Math.round(Number(form.max_products))),
          is_active: form.is_active,
          sort_order: Math.max(0, Math.round(Number(form.sort_order) || 0)),
        },
      }),
    onSuccess: () => {
      toast.success("Plano salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-plans-view"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminDeletePlan({ data: { id } }),
    onSuccess: () => {
      toast.success("Plano excluído");
      qc.invalidateQueries({ queryKey: ["admin-plans-view"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Planos de lojistas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tiers disponíveis para assinatura.</p>
        </div>
        <button
          onClick={() => setEditing({ ...emptyForm, sort_order: (data?.length ?? 0) })}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Novo plano
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {((data ?? []) as PlanRow[]).map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-[10px] font-mono uppercase tracking-widest">{p.slug}</span>
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase ${p.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                  {p.is_active ? "ativo" : "inativo"}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold">{p.name}</h3>
              <p className="mt-3 font-mono text-2xl">
                R$ {(p.price_cents / 100).toFixed(2).replace(".", ",")}
                <span className="text-xs text-muted-foreground">/mês</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Limite: {p.max_products ? `${p.max_products} produtos` : "ilimitado"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Ordem: {p.sort_order}</p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setEditing({
                    id: p.id, slug: p.slug, name: p.name, price_cents: p.price_cents,
                    max_products: p.max_products === null ? "" : String(p.max_products),
                    is_active: p.is_active, sort_order: p.sort_order,
                  })}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button
                  onClick={() => { if (confirm(`Excluir plano "${p.name}"?`)) del.mutate(p.id); }}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-destructive/40 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{editing.id ? "Editar plano" : "Novo plano"}</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => { e.preventDefault(); upsert.mutate(editing); }}
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs">
                  <span className="text-muted-foreground">Nome</span>
                  <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" />
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Slug</span>
                  <input required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-sm" />
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Preço (centavos/mês)</span>
                  <input required type="number" min={0} value={editing.price_cents} onChange={(e) => setEditing({ ...editing, price_cents: Number(e.target.value) })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-sm" />
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Máx. produtos (vazio = ilimitado)</span>
                  <input type="number" min={0} value={editing.max_products} onChange={(e) => setEditing({ ...editing, max_products: e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-sm" />
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Ordem</span>
                  <input type="number" min={0} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-sm" />
                </label>
                <label className="flex items-center gap-2 pt-5 text-xs">
                  <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                  <span>Ativo</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Cancelar</button>
                <button type="submit" disabled={upsert.isPending} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {upsert.isPending ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Para atribuir planos individualmente, use a página de <a href="/admin/lojas" className="text-primary hover:underline">Lojas</a>.
      </p>
    </div>
  );
}
