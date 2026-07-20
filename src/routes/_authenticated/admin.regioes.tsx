import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminRegionSummary, adminUpdateStoreLocation, type RegionSummary } from "@/lib/admin-phase4.functions";
import { supabase } from "@/integrations/supabase/client";
import { Map, MapPin, Store as StoreIcon, MousePointerClick, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/regioes")({
  component: RegioesPage,
});

const UF_LIST = ["PR","SP","RJ","MG","RS","SC","BA","PE","CE","DF","GO","ES","PA","MA","MT","MS","AM","PB","RN","AL","PI","SE","RO","TO","AC","AP","RR"];

function RegioesPage() {
  const q = useQuery({ queryKey: ["admin", "regions"], queryFn: () => adminRegionSummary() });
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"cities" | "unlinked">("cities");
  const qc = useQueryClient();

  const unlinkedQ = useQuery({
    queryKey: ["admin", "regions", "unlinked"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name, slug, city, state").is("city", null).limit(200);
      return (data ?? []) as Array<{ id: string; name: string; slug: string; city: string | null; state: string | null }>;
    },
    enabled: tab === "unlinked",
  });

  const updateLoc = useMutation({
    mutationFn: (v: { store_id: string; city: string; state: string }) => adminUpdateStoreLocation({ data: v }),
    onSuccess: () => {
      toast.success("Localização atualizada");
      qc.invalidateQueries({ queryKey: ["admin", "regions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = q.data;
  const filtered = useMemo(() => {
    if (!d) return [] as RegionSummary["by_city"];
    const f = filter.trim().toLowerCase();
    return f ? d.by_city.filter((c) => c.city.toLowerCase().includes(f) || c.state.toLowerCase().includes(f)) : d.by_city;
  }, [d, filter]);

  const maxStores = d?.by_city[0]?.stores ?? 1;

  const cityCols: Column<RegionSummary["by_city"][number]>[] = [
    { key: "city", header: "Cidade", cell: (r) => (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 items-center rounded-md border border-border/50 px-1.5 font-mono text-[10px] text-muted-foreground">{r.state}</span>
        <span className="font-medium">{r.city}</span>
      </div>
    )},
    { key: "stores", header: "Lojas", align: "right", cell: (r) => (
      <div className="flex items-center justify-end gap-2">
        <span className="font-mono">{r.stores}</span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${(r.stores / maxStores) * 100}%` }} />
        </div>
      </div>
    )},
    { key: "products", header: "Ofertas", align: "right", cell: (r) => <span className="font-mono">{r.products}</span> },
    { key: "clicks_30d", header: "Cliques 30d", align: "right", cell: (r) => <span className="font-mono text-highlight">{r.clicks_30d}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regiões"
        description="Distribuição geográfica das lojas, com foco no Paraná."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de lojas" value={d?.total_stores ?? "—"} icon={StoreIcon} accent="primary" />
        <StatCard label="Cidades cobertas" value={d?.cities_covered ?? "—"} icon={MapPin} accent="highlight" />
        <StatCard label="Estados atendidos" value={d?.by_state.length ?? "—"} icon={Map} accent="success" />
        <StatCard label="Sem localização" value={d?.uncategorized ?? "—"} icon={MousePointerClick} accent="destructive" hint="Requerem cadastro" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Distribuição por estado</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {(d?.by_state ?? []).map((s) => (
            <div key={s.state} className={`rounded-lg border p-3 text-center transition ${s.state === "PR" ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card/50"}`}>
              <div className="font-mono text-xs uppercase text-muted-foreground">{s.state}</div>
              <div className="mt-1 font-mono text-lg tabular-nums">{s.count}</div>
            </div>
          ))}
          {!d?.by_state.length && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">Sem dados regionais ainda.</p>}
        </div>
      </div>

      {d?.pr_drilldown && (
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex h-6 items-center rounded-md border border-primary/40 bg-primary/10 px-2 font-mono text-[11px] text-primary">PR</span>
                Drill-down Paraná
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Análise regional detalhada de lojas, ofertas e cliques.</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Estado foco</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MiniCell label="Lojas PR" value={d.pr_drilldown.total_stores} />
            <MiniCell label="Cidades PR" value={d.pr_drilldown.cities} />
            <MiniCell label="Ofertas" value={d.pr_drilldown.total_products} />
            <MiniCell label="Cliques 30d" value={d.pr_drilldown.total_clicks_30d} accent="highlight" />
            <MiniCell label="Concentração top 3" value={`${d.pr_drilldown.concentration_top3_pct}%`} accent="primary" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top cidades no Paraná</h4>
              {d.pr_drilldown.top_cities.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem lojas cadastradas no PR ainda.</p>
              ) : (
                <div className="space-y-2">
                  {d.pr_drilldown.top_cities.map((c, i) => (
                    <div key={c.city} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 font-mono text-[11px] text-muted-foreground">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">{c.city}</span>
                          <span className="font-mono text-xs text-muted-foreground">{c.share_stores}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${c.share_stores}%` }} />
                        </div>
                        <div className="mt-1 flex gap-3 font-mono text-[10px] text-muted-foreground">
                          <span>{c.stores} lojas</span>
                          <span>{c.products} ofertas</span>
                          <span className="text-highlight">{c.clicks_30d} cliques</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meso-regiões</h4>
              {d.pr_drilldown.regions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem dados regionais.</p>
              ) : (
                <div className="space-y-2">
                  {d.pr_drilldown.regions.map((r) => {
                    const share = d.pr_drilldown.total_stores > 0 ? (r.stores / d.pr_drilldown.total_stores) * 100 : 0;
                    return (
                      <div key={r.region} className="rounded-md border border-border/40 bg-background/50 p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">{r.region}</span>
                          <span className="font-mono text-xs text-primary">{r.stores} lojas</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-gradient-to-r from-primary to-highlight" style={{ width: `${share}%` }} />
                        </div>
                        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                          <span>{r.products} ofertas</span>
                          <span>{r.clicks_30d} cliques 30d</span>
                          <span>{share.toFixed(1)}% do PR</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 p-4">
          <div className="flex gap-1 rounded-md border border-border/60 bg-background p-0.5">
            <button onClick={() => setTab("cities")} className={`rounded px-3 py-1 text-xs font-medium ${tab === "cities" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Ranking por cidade</button>
            <button onClick={() => setTab("unlinked")} className={`rounded px-3 py-1 text-xs font-medium ${tab === "unlinked" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Sem localização ({d?.uncategorized ?? 0})</button>
          </div>
          {tab === "cities" && (
            <div className="ml-auto flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar cidade ou UF…" className="w-52 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="p-4">
          {tab === "cities" ? (
            <DataTable rows={filtered} columns={cityCols} isLoading={q.isLoading} getRowId={(r) => `${r.state}-${r.city}`} emptyMessage="Nenhuma cidade cadastrada." />
          ) : (
            <UnlinkedTable
              rows={unlinkedQ.data ?? []}
              isLoading={unlinkedQ.isLoading}
              onSave={(v) => updateLoc.mutate(v)}
              saving={updateLoc.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function UnlinkedTable({
  rows, isLoading, onSave, saving,
}: {
  rows: Array<{ id: string; name: string; slug: string; city: string | null; state: string | null }>;
  isLoading: boolean;
  onSave: (v: { store_id: string; city: string; state: string }) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, { city: string; state: string }>>({});
  if (isLoading) return <p className="py-12 text-center text-sm text-muted-foreground">Carregando…</p>;
  if (!rows.length) return <p className="py-12 text-center text-sm text-muted-foreground">Todas as lojas já estão categorizadas.</p>;
  return (
    <div className="divide-y divide-border/40">
      {rows.map((r) => {
        const d = draft[r.id] ?? { city: "", state: r.state ?? "PR" };
        return (
          <div key={r.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">/{r.slug}</p>
            </div>
            <input
              value={d.city}
              onChange={(e) => setDraft((p) => ({ ...p, [r.id]: { ...d, city: e.target.value } }))}
              placeholder="Cidade"
              className="h-8 w-40 rounded-md border border-border/60 bg-background px-2 text-sm outline-none focus:border-primary/50"
            />
            <select
              value={d.state}
              onChange={(e) => setDraft((p) => ({ ...p, [r.id]: { ...d, state: e.target.value } }))}
              className="h-8 rounded-md border border-border/60 bg-background px-2 text-sm outline-none focus:border-primary/50"
            >
              {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
            <button
              disabled={!d.city.trim() || saving}
              onClick={() => onSave({ store_id: r.id, city: d.city.trim(), state: d.state })}
              className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MiniCell({ label, value, accent }: { label: string; value: number | string; accent?: "primary" | "highlight" }) {
  const color = accent === "primary" ? "text-primary" : accent === "highlight" ? "text-highlight" : "text-foreground";
  return (
    <div className="rounded-lg border border-border/50 bg-card/70 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-lg tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
