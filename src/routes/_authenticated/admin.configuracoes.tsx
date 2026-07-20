import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/ui";
import { adminGetSettings, adminUpdateSetting } from "@/lib/admin-phase3.functions";
import { Save, Settings2, Search, Share2, LineChart, Scale } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: SettingsPage,
});

type SectionDef = {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: Array<{ name: string; label: string; type?: "text" | "textarea" | "url" | "email"; placeholder?: string }>;
};

const SECTIONS: SectionDef[] = [
  {
    key: "general", title: "Geral", description: "Identidade e contato do site.", icon: Settings2,
    fields: [
      { name: "site_name", label: "Nome do site" },
      { name: "tagline", label: "Slogan" },
      { name: "support_email", label: "E-mail de suporte", type: "email" },
      { name: "logo_url", label: "URL do logo", type: "url" },
      { name: "favicon_url", label: "URL do favicon", type: "url" },
    ],
  },
  {
    key: "seo", title: "SEO", description: "Título e descrição padrão para SEO.", icon: Search,
    fields: [
      { name: "default_title", label: "Título padrão" },
      { name: "default_description", label: "Descrição padrão", type: "textarea" },
      { name: "og_image", label: "Imagem OG padrão (URL)", type: "url" },
    ],
  },
  {
    key: "social", title: "Redes sociais", description: "Links para redes sociais oficiais.", icon: Share2,
    fields: [
      { name: "instagram", label: "Instagram", type: "url" },
      { name: "twitter", label: "Twitter/X", type: "url" },
      { name: "facebook", label: "Facebook", type: "url" },
      { name: "youtube", label: "YouTube", type: "url" },
    ],
  },
  {
    key: "analytics", title: "Analytics", description: "IDs de rastreamento (GA4, GTM, Meta Pixel).", icon: LineChart,
    fields: [
      { name: "ga_id", label: "Google Analytics ID (G-XXXX)" },
      { name: "gtm_id", label: "Google Tag Manager ID (GTM-XXXX)" },
      { name: "meta_pixel", label: "Meta Pixel ID" },
    ],
  },
  {
    key: "legal", title: "LGPD & Legal", description: "Links para políticas e contato de privacidade.", icon: Scale,
    fields: [
      { name: "privacy_url", label: "URL da Política de Privacidade", type: "url" },
      { name: "terms_url", label: "URL dos Termos de Uso", type: "url" },
      { name: "lgpd_contact", label: "E-mail do encarregado (LGPD)", type: "email" },
    ],
  },
];

function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: () => adminGetSettings() });
  const m = useMutation({
    mutationFn: (payload: { key: string; value: Record<string, unknown> }) => adminUpdateSetting({ data: payload }),
    onSuccess: () => { toast.success("Configuração salva"); qc.invalidateQueries({ queryKey: ["admin", "settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Identidade do site, SEO, redes, analytics e LGPD." />
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((s) => {
          const row = q.data?.find((r) => r.key === s.key);
          const values = row ? (JSON.parse(row.value_json) as Record<string, unknown>) : {};
          return (
            <SettingCard
              key={s.key}
              def={s}
              values={values}
              loading={q.isLoading}
              onSave={(value) => m.mutate({ key: s.key, value })}
              saving={m.isPending && m.variables?.key === s.key}
            />
          );
        })}
      </div>
    </div>
  );
}


function SettingCard({ def, values, loading, onSave, saving }: {
  def: SectionDef;
  values: Record<string, unknown>;
  loading: boolean;
  onSave: (v: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [state, setState] = useState<Record<string, string>>({});
  useEffect(() => {
    const s: Record<string, string> = {};
    for (const f of def.fields) s[f.name] = String(values[f.name] ?? "");
    setState(s);
  }, [values, def]);

  const Icon = def.icon;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{def.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{def.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {def.fields.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea
                value={state[f.name] ?? ""}
                onChange={(e) => setState((v) => ({ ...v, [f.name]: e.target.value }))}
                placeholder={f.placeholder}
                rows={3}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                disabled={loading}
              />
            ) : (
              <input
                type={f.type ?? "text"}
                value={state[f.name] ?? ""}
                onChange={(e) => setState((v) => ({ ...v, [f.name]: e.target.value }))}
                placeholder={f.placeholder}
                className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
                disabled={loading}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onSave(state)}
          disabled={saving || loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}
