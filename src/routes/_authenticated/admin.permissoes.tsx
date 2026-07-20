import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { PageHeader, SearchInput, Section } from "@/components/admin/ui";
import { adminRoleCounts } from "@/lib/admin-phase3.functions";
import {
  Check, X, ShieldCheck, Store, User, Shield, ChevronDown, ChevronRight,
  Info, Users, AlertTriangle, Printer, Download,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/permissoes")({
  component: PermissionsPage,
});

const ROLES = [
  { key: "admin",     label: "Administrador", icon: ShieldCheck, tone: "primary",   description: "Acesso total ao sistema, incluindo configurações e papéis." },
  { key: "moderator", label: "Moderador",     icon: Shield,      tone: "highlight", description: "Modera catálogo, solicitações e denúncias." },
  { key: "merchant",  label: "Lojista",       icon: Store,       tone: "success",   description: "Gerencia sua loja e seus próprios produtos." },
  { key: "user",      label: "Consumidor",    icon: User,        tone: "muted",     description: "Navega, compara preços e cria alertas." },
] as const;

type RoleKey = typeof ROLES[number]["key"];

type Cap = { label: string; perms: Record<RoleKey, boolean>; danger?: boolean };

const CAPS: Array<{ group: string; items: Cap[] }> = [
  {
    group: "Catálogo",
    items: [
      { label: "Ver produtos e lojas",         perms: { admin: true, moderator: true,  merchant: true,  user: true  } },
      { label: "Cadastrar produtos próprios",  perms: { admin: true, moderator: false, merchant: true,  user: false } },
      { label: "Editar qualquer produto",      perms: { admin: true, moderator: true,  merchant: false, user: false } },
      { label: "Excluir produtos",             perms: { admin: true, moderator: false, merchant: false, user: false }, danger: true },
    ],
  },
  {
    group: "Lojas",
    items: [
      { label: "Criar loja própria",           perms: { admin: true, moderator: false, merchant: true,  user: true  } },
      { label: "Editar vitrine própria",       perms: { admin: true, moderator: false, merchant: true,  user: false } },
      { label: "Aprovar / bloquear lojas",     perms: { admin: true, moderator: true,  merchant: false, user: false } },
      { label: "Ajustar trust score",          perms: { admin: true, moderator: false, merchant: false, user: false } },
    ],
  },
  {
    group: "Moderação",
    items: [
      { label: "Ver solicitações",             perms: { admin: true, moderator: true,  merchant: false, user: false } },
      { label: "Decidir aprovações",           perms: { admin: true, moderator: true,  merchant: false, user: false } },
      { label: "Gerenciar denúncias",          perms: { admin: true, moderator: true,  merchant: false, user: false } },
      { label: "Criar denúncia",               perms: { admin: true, moderator: true,  merchant: true,  user: true  } },
    ],
  },
  {
    group: "Sistema",
    items: [
      { label: "Gerenciar planos",             perms: { admin: true, moderator: false, merchant: false, user: false }, danger: true },
      { label: "Conceder / revogar papéis",    perms: { admin: true, moderator: false, merchant: false, user: false }, danger: true },
      { label: "Editar configurações do site", perms: { admin: true, moderator: false, merchant: false, user: false }, danger: true },
      { label: "Ver logs de auditoria",        perms: { admin: true, moderator: false, merchant: false, user: false } },
    ],
  },
];

const TOTAL_CAPS = CAPS.reduce((s, g) => s + g.items.length, 0);

function toneClasses(tone: (typeof ROLES)[number]["tone"]) {
  switch (tone) {
    case "primary":   return { icon: "bg-primary/10 text-primary",       ring: "ring-primary/40",     bar: "bg-primary" };
    case "highlight": return { icon: "bg-highlight/10 text-highlight",   ring: "ring-highlight/40",   bar: "bg-highlight" };
    case "success":   return { icon: "bg-success/10 text-success",       ring: "ring-success/40",     bar: "bg-success" };
    default:          return { icon: "bg-muted text-muted-foreground",   ring: "ring-border",         bar: "bg-muted-foreground/60" };
  }
}

function PermissionsPage() {
  const q = useQuery({ queryKey: ["admin", "role-counts"], queryFn: () => adminRoleCounts() });
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<RoleKey | "all">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dangerOnly, setDangerOnly] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return CAPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        if (dangerOnly && !it.danger) return false;
        if (!term) return true;
        return it.label.toLowerCase().includes(term) || g.group.toLowerCase().includes(term);
      }),
    })).filter((g) => g.items.length > 0);
  }, [query, dangerOnly]);

  const roleTotals = useMemo(() => {
    const totals: Record<RoleKey, number> = { admin: 0, moderator: 0, merchant: 0, user: 0 };
    for (const g of CAPS) for (const it of g.items) for (const r of ROLES) if (it.perms[r.key]) totals[r.key]++;
    return totals;
  }, []);

  function exportCSV() {
    const rows: string[] = [];
    rows.push(["Grupo", "Capacidade", ...ROLES.map((r) => r.label)].join(","));
    for (const g of CAPS) for (const it of g.items) {
      rows.push([g.group, `"${it.label.replace(/"/g, '""')}"`, ...ROLES.map((r) => (it.perms[r.key] ? "sim" : "não"))].join(","));
    }
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `permissoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Matriz exportada");
  }

  const totalVisible = filtered.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissões"
        description="Matriz de capacidades por papel. Reflete RLS e regras aplicadas em server functions."
        actions={
          <>
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-card px-3 text-xs hover:bg-accent"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-card px-3 text-xs hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <Link
              to="/admin/usuarios"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Users className="h-3.5 w-3.5" /> Gerenciar usuários
            </Link>
          </>
        }
      />

      {/* Role KPI cards — click to focus a column */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => {
          const t = toneClasses(r.tone);
          const Icon = r.icon;
          const pct = Math.round((roleTotals[r.key] / TOTAL_CAPS) * 100);
          const active = focus === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setFocus(active ? "all" : r.key)}
              className={`group relative overflow-hidden rounded-xl border bg-card p-4 text-left shadow-sm transition ${
                active ? `border-transparent ring-2 ${t.ring}` : "border-border/60 hover:border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`grid h-9 w-9 place-items-center rounded-md ${t.icon}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none">{r.label}</p>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{r.key}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ring-1 ${active ? `${t.icon} ${t.ring}` : "text-muted-foreground ring-border"}`}>
                  {active ? "focado" : "focar"}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{q.data?.[r.key] ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">usuários</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {roleTotals[r.key]}/{TOTAL_CAPS}
                  </p>
                  <p className="text-[10px] text-muted-foreground">capacidades</p>
                </div>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${t.bar} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{r.description}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar capacidade ou grupo…"
          className="w-full sm:w-80"
        />
        <button
          onClick={() => setDangerOnly((v) => !v)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs transition ${
            dangerOnly
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border/60 bg-card hover:bg-accent"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Só sensíveis
        </button>
        {focus !== "all" && (
          <button
            onClick={() => setFocus("all")}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-card px-3 text-xs hover:bg-accent"
          >
            Limpar foco
          </button>
        )}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-success" /> Permitido</span>
          <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5 text-muted-foreground/50" /> Negado</span>
          <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Sensível</span>
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            <tr className="border-b border-border/60 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <th className="w-[42%] px-4 py-3 font-medium">Capacidade</th>
              {ROLES.map((r) => {
                const t = toneClasses(r.tone);
                const dim = focus !== "all" && focus !== r.key;
                return (
                  <th
                    key={r.key}
                    onClick={() => setFocus(focus === r.key ? "all" : r.key)}
                    className={`cursor-pointer select-none px-3 py-3 text-center font-medium transition ${
                      dim ? "opacity-40" : ""
                    } ${focus === r.key ? "bg-muted/40" : "hover:bg-muted/30"}`}
                  >
                    <div className="mx-auto flex flex-col items-center gap-1">
                      <span>{r.label}</span>
                      <span className={`inline-block h-1 w-8 rounded-full ${t.bar}`} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={ROLES.length + 1} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Nenhuma capacidade encontrada com estes filtros.
                </td>
              </tr>
            ) : filtered.map((group) => {
              const isCollapsed = collapsed[group.group];
              return (
                <Fragment key={group.group}>
                  <tr className="bg-muted/20">
                    <td
                      colSpan={ROLES.length + 1}
                      className="cursor-pointer px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:bg-muted/40"
                      onClick={() => setCollapsed((c) => ({ ...c, [group.group]: !c[group.group] }))}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {group.group}
                        <span className="text-muted-foreground/60">· {group.items.length}</span>
                      </span>
                    </td>
                  </tr>
                  {!isCollapsed && group.items.map((cap) => (
                    <tr key={cap.label} className="group transition-colors hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{cap.label}</span>
                          {cap.danger && (
                            <span
                              title="Ação sensível — apenas administradores"
                              className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-destructive ring-1 ring-destructive/30"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" /> sensível
                            </span>
                          )}
                        </div>
                      </td>
                      {ROLES.map((r) => {
                        const allowed = cap.perms[r.key];
                        const dim = focus !== "all" && focus !== r.key;
                        return (
                          <td
                            key={r.key}
                            className={`px-3 py-2.5 text-center transition ${dim ? "opacity-30" : ""} ${focus === r.key ? "bg-muted/30" : ""}`}
                          >
                            {allowed ? (
                              <span className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/50 ring-1 ring-border/60">
                                <X className="h-3 w-3" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-border/60 bg-muted/20 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <td className="px-4 py-2">{totalVisible} de {TOTAL_CAPS} capacidades</td>
                {ROLES.map((r) => (
                  <td key={r.key} className="px-3 py-2 text-center tabular-nums">
                    {roleTotals[r.key]}/{TOTAL_CAPS}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Section title="Como funciona" description="Papéis são atribuídos por usuário; as regras abaixo são aplicadas por RLS e verificadas nas server functions.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Um usuário pode ter <strong className="text-foreground">múltiplos papéis</strong>. A permissão efetiva é a união das capacidades.
            </p>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-muted-foreground">
              Ações marcadas como <strong className="text-foreground">sensíveis</strong> alteram dados irreversíveis ou concedem privilégios — restritas a admins.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
