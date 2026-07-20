import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListBrands, adminUpsertBrand, adminDeleteBrand } from "@/lib/admin-phase2.functions";
import { PageHeader } from "@/components/admin/ui";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Globe } from "lucide-react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/admin/marcas")({
  component: BrandsPage,
});

type Brand = { id: string; slug: string; name: string; logo_url: string | null; country: string | null; website: string | null; description: string | null; active: boolean };
type Draft = { id?: string; slug: string; name: string; logo_url: string; country: string; website: string; description: string; active: boolean };

const empty: Draft = { slug: "", name: "", logo_url: "", country: "", website: "", description: "", active: true };

function BrandsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin-brands"], queryFn: () => adminListBrands() });
  const [editing, setEditing] = useState<Draft | null>(null);
  const { confirm, dialog } = useConfirm();

  const upsert = useMutation({
    mutationFn: (d: Draft) => adminUpsertBrand({ data: {
      id: d.id, slug: d.slug, name: d.name, active: d.active,
      logo_url: d.logo_url || null, country: d.country || null, website: d.website || null, description: d.description || null,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-brands"] }); toast.success("Marca salva"); setEditing(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteBrand({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-brands"] }); toast.success("Marca removida"); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marcas"
        description="Cadastro central de marcas — logo, país de origem e status."
        actions={
          <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Nova marca
          </button>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase font-mono tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">País</th>
              <th className="px-4 py-3 font-medium">Site</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="p-6"><div className="mx-auto h-4 w-40 animate-pulse rounded bg-muted" /></td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="p-6 text-center">
                <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
                <button onClick={() => refetch()} className="mt-2 text-xs text-primary hover:underline">Tentar novamente</button>
              </td></tr>
            ) : (data ?? []).length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma marca cadastrada. Clique em “Nova marca” para começar.</td></tr>
            ) : (data as Brand[]).map((b) => (
              <tr key={b.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="h-8 w-8 rounded object-contain bg-muted" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted grid place-items-center text-[10px] font-mono text-muted-foreground">{b.name.slice(0, 2).toUpperCase()}</div>
                    )}
                    <div>
                      <div className="font-medium">{b.name}</div>
                      {b.description && <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">{b.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.slug}</td>
                <td className="px-4 py-3 text-xs">{b.country ?? "—"}</td>
                <td className="px-4 py-3">
                  {b.website ? (
                    <a href={b.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Globe className="h-3 w-3" /> visitar
                    </a>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-mono ${b.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {b.active ? "ATIVA" : "INATIVA"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setEditing({ id: b.id, slug: b.slug, name: b.name, logo_url: b.logo_url ?? "", country: b.country ?? "", website: b.website ?? "", description: b.description ?? "", active: b.active })} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button onClick={async () => { if (await confirm({ title: `Remover "${b.name}"?`, description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir", destructive: true })) remove.mutate(b.id); }} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{editing.id ? "Editar marca" : "Nova marca"}</h2>
            <div className="mt-4 grid gap-3">
              <Field label="Nome">
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input" />
              </Field>
              <Field label="Slug">
                <input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="input font-mono" placeholder="marca-slug" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="País"><input value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} className="input" placeholder="BR" /></Field>
                <Field label="Website"><input value={editing.website} onChange={(e) => setEditing({ ...editing, website: e.target.value })} className="input" placeholder="https://…" /></Field>
              </div>
              <Field label="Logo (URL)"><input value={editing.logo_url} onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })} className="input" placeholder="https://…" /></Field>
              <Field label="Descrição"><textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="input min-h-[80px] py-2" /></Field>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Marca ativa
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="h-9 px-3 rounded-md border border-border text-sm">Cancelar</button>
              <button
                disabled={upsert.isPending}
                onClick={() => {
                  if (!editing.name.trim() || !editing.slug.trim()) { toast.error("Nome e slug são obrigatórios"); return; }
                  upsert.mutate(editing);
                }}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
              >
                {upsert.isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input { height: 36px; padding: 0 10px; border-radius: 6px; border: 1px solid hsl(var(--input)); background: hsl(var(--background)); font-size: 14px; width: 100%; }`}</style>
      {dialog}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
