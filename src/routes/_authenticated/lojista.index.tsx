import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { toast } from "sonner";
import { getMyStore, upsertMyStore, uploadCatalog, getStoreAnalytics } from "@/lib/products.functions";
import { getMySubscription } from "@/lib/subscriptions.functions";

import { Upload, Store as StoreIcon, BarChart3, CreditCard, Lock } from "lucide-react";


export const Route = createFileRoute("/_authenticated/lojista/")({
  head: () => ({ meta: [{ title: "Painel do lojista — PrecinhoBom" }, { name: "robots", content: "noindex" }] }),
  component: LojistaPage,
});

function LojistaPage() {
  const [tab, setTab] = useState<"loja" | "catalogo" | "analytics">("loja");
  const { data: sub } = useQuery({ queryKey: ["my-subscription"], queryFn: () => getMySubscription() });
  const now = Date.now();
  const trialOk = sub?.status === "trialing" && sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() > now;
  const activeOk = sub?.status === "active" && sub.current_period_end && new Date(sub.current_period_end).getTime() > now;
  const hasAccess = trialOk || activeOk;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Painel do lojista</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre sua loja, envie seu catálogo e acompanhe cliques.
          </p>
        </div>
        <Link
          to="/lojista/assinatura"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 h-10 text-sm hover:border-primary/60"
        >
          <CreditCard className="h-4 w-4" />
          {hasAccess ? (sub?.plan?.name ? `Plano: ${sub.plan.name}` : "Minha assinatura") : "Assinar plano"}
        </Link>
      </div>

      {!hasAccess ? (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm flex items-start gap-3">
          <Lock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Assine um plano para publicar produtos</p>
            <p className="mt-1 text-muted-foreground">
              Você pode cadastrar sua loja livremente, mas o envio de catálogo requer plano ativo.{" "}
              <Link to="/lojista/assinatura" className="text-primary hover:underline">
                Ver planos (30 dias grátis)
              </Link>
            </p>
          </div>
        </div>
      ) : null}


      <div className="mt-6 flex gap-1 border-b border-border">
        {[
          { k: "loja", l: "Loja", i: StoreIcon },
          { k: "catalogo", l: "Catálogo (CSV)", i: Upload },
          { k: "analytics", l: "Analytics", i: BarChart3 },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 -mb-px ${tab === t.k ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <t.i className="h-4 w-4" /> {t.l}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "loja" ? <StoreForm /> : tab === "catalogo" ? <CatalogUpload /> : <Analytics />}
      </div>
    </div>
  );
}

function StoreForm() {
  const qc = useQueryClient();
  const { data: store } = useQuery({ queryKey: ["my-store"], queryFn: () => getMyStore() });
  const [form, setForm] = useState({ name: "", slug: "", description: "", logo_url: "" });
  useEffect(() => {
    if (store) {
      setForm({ name: store.name, slug: store.slug, description: store.description ?? "", logo_url: store.logo_url ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  const save = useMutation({
    mutationFn: () => upsertMyStore({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Loja salva! Após aprovação suas ofertas aparecerão publicamente.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl space-y-4">
      {store?.status === "pending" ? (
        <div className="p-3 rounded-lg bg-highlight/20 text-sm">
          Sua loja está em <strong>análise</strong>. Ofertas ficam visíveis após aprovação.
        </div>
      ) : store?.status === "approved" ? (
        <div className="p-3 rounded-lg bg-success/15 text-sm text-success">Loja aprovada ✓</div>
      ) : null}

      <Field label="Nome da loja">
        <input
          className="w-full h-11 px-3 rounded border border-input bg-card text-sm"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>
      <Field label="Slug (usado na URL)" hint="minúsculas, sem espaços, ex: minha-loja">
        <input
          className="w-full h-11 px-3 rounded border border-input bg-card text-sm"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
        />
      </Field>
      <Field label="Descrição">
        <textarea
          className="w-full min-h-24 px-3 py-2 rounded border border-input bg-card text-sm"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <Field label="URL do logo (opcional)">
        <input
          className="w-full h-11 px-3 rounded border border-input bg-card text-sm"
          value={form.logo_url}
          onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
        />
      </Field>
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending || !form.name || !form.slug}
        className="rounded-full bg-primary text-primary-foreground px-5 h-11 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {save.isPending ? "Salvando…" : "Salvar loja"}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint ? <span className="ml-2 text-xs text-muted-foreground">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function CatalogUpload() {
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);
  const upload = useMutation({
    mutationFn: (rows: Record<string, unknown>[]) =>
      uploadCatalog({
        data: {
          rows: rows.map((r) => ({
            sku: String(r.sku ?? ""),
            name: String(r.name ?? ""),
            brand: r.brand ? String(r.brand) : null,
            category: r.category ? String(r.category) : null,
            price: Number(r.price),
            url: String(r.url ?? ""),
            image: r.image ? String(r.image) : null,
          })),
        },
      }),
    onSuccess: (r) => toast.success(`Enviado! ${r.created} criados, ${r.updated} atualizados.`),
    onError: (e: Error) => toast.error(e.message),
  });

  function onFile(f: File) {
    Papa.parse<Record<string, unknown>>(f, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (res) => setPreview(res.data.slice(0, 500)),
    });
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-border bg-card text-sm">
        <p className="font-medium">Formato esperado (CSV com cabeçalho):</p>
        <code className="mt-2 block text-xs text-muted-foreground">
          sku,name,brand,category,price,url,image
        </code>
        <p className="mt-2 text-muted-foreground">
          Campo <code>category</code> deve ser o slug: eletronicos, celulares, informatica, casa-cozinha, moda, esporte-lazer, beleza-perfumaria, livros.
        </p>
      </div>

      <label className="block p-8 rounded-lg border-2 border-dashed border-border bg-card text-center cursor-pointer hover:border-primary/50">
        <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm">Clique ou arraste um arquivo CSV (até 500 linhas)</p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {preview ? (
        <div>
          <p className="text-sm text-muted-foreground mb-2">{preview.length} linhas prontas para envio.</p>
          <button
            onClick={() => upload.mutate(preview)}
            disabled={upload.isPending}
            className="rounded-full bg-primary text-primary-foreground px-5 h-11 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {upload.isPending ? "Enviando…" : "Confirmar envio"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ["store-analytics"], queryFn: () => getStoreAnalytics() });
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Ofertas ativas" value={data.offers} />
        <Stat label="Cliques (30 dias)" value={data.clicks} />
      </div>
      <div>
        <h3 className="font-medium text-foreground">Top produtos por cliques</h3>
        <ul className="mt-3 divide-y divide-border border border-border rounded-lg bg-card">
          {data.topProducts.length ? (
            data.topProducts.map((p) => (
              <li key={p.slug} className="flex items-center justify-between p-3 text-sm">
                <span>{p.name}</span>
                <span className="text-muted-foreground">{p.count} cliques</span>
              </li>
            ))
          ) : (
            <li className="p-4 text-sm text-muted-foreground text-center">Sem cliques ainda.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
