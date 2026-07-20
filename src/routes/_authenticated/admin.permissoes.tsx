import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/admin/ui";
import { adminRoleCounts } from "@/lib/admin-phase3.functions";
import { Check, X, ShieldCheck, Store, User, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/permissoes")({
  component: PermissionsPage,
});

const ROLES = [
  { key: "admin", label: "Administrador", icon: ShieldCheck, color: "text-primary" },
  { key: "moderator", label: "Moderador", icon: Shield, color: "text-highlight" },
  { key: "merchant", label: "Lojista", icon: Store, color: "text-success" },
  { key: "user", label: "Consumidor", icon: User, color: "text-muted-foreground" },
] as const;

type RoleKey = typeof ROLES[number]["key"];

const CAPS: Array<{ group: string; items: Array<{ label: string; perms: Record<RoleKey, boolean> }> }> = [
  {
    group: "Catálogo",
    items: [
      { label: "Ver produtos e lojas", perms: { admin: true, moderator: true, merchant: true, user: true } },
      { label: "Cadastrar produtos próprios", perms: { admin: true, moderator: false, merchant: true, user: false } },
      { label: "Editar qualquer produto", perms: { admin: true, moderator: true, merchant: false, user: false } },
      { label: "Excluir produtos", perms: { admin: true, moderator: false, merchant: false, user: false } },
    ],
  },
  {
    group: "Lojas",
    items: [
      { label: "Criar loja própria", perms: { admin: true, moderator: false, merchant: true, user: true } },
      { label: "Editar vitrine própria", perms: { admin: true, moderator: false, merchant: true, user: false } },
      { label: "Aprovar / bloquear lojas", perms: { admin: true, moderator: true, merchant: false, user: false } },
      { label: "Ajustar trust score", perms: { admin: true, moderator: false, merchant: false, user: false } },
    ],
  },
  {
    group: "Moderação",
    items: [
      { label: "Ver solicitações", perms: { admin: true, moderator: true, merchant: false, user: false } },
      { label: "Decidir aprovações", perms: { admin: true, moderator: true, merchant: false, user: false } },
      { label: "Gerenciar denúncias", perms: { admin: true, moderator: true, merchant: false, user: false } },
      { label: "Criar denúncia", perms: { admin: true, moderator: true, merchant: true, user: true } },
    ],
  },
  {
    group: "Sistema",
    items: [
      { label: "Gerenciar planos", perms: { admin: true, moderator: false, merchant: false, user: false } },
      { label: "Conceder / revogar papéis", perms: { admin: true, moderator: false, merchant: false, user: false } },
      { label: "Editar configurações do site", perms: { admin: true, moderator: false, merchant: false, user: false } },
      { label: "Ver logs de auditoria", perms: { admin: true, moderator: false, merchant: false, user: false } },
    ],
  },
];

function PermissionsPage() {
  const q = useQuery({ queryKey: ["admin", "role-counts"], queryFn: () => adminRoleCounts() });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissões"
        description="Matriz de permissões por papel. Papéis são atribuídos em Usuários."
        actions={
          <Link
            to="/admin/usuarios"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >Gerenciar usuários →</Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.key} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2.5">
                <div className={`grid h-9 w-9 place-items-center rounded-md bg-muted ${r.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{r.label}</p>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{r.key}</p>
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{q.data?.[r.key] ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">usuários com este papel</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-3 font-medium">Capacidade</th>
              {ROLES.map((r) => (
                <th key={r.key} className="px-4 py-3 text-center font-medium">{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {CAPS.map((group) => (
              <>
                <tr key={group.group} className="bg-muted/20">
                  <td colSpan={ROLES.length + 1} className="px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    {group.group}
                  </td>
                </tr>
                {group.items.map((cap) => (
                  <tr key={cap.label}>
                    <td className="px-4 py-2.5 text-sm">{cap.label}</td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="px-4 py-2.5 text-center">
                        {cap.perms[r.key] ? (
                          <Check className="mx-auto h-4 w-4 text-success" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Esta matriz reflete as regras aplicadas atualmente pelas RLS e pelas server functions. Para ajustar quem tem cada papel, use a área de Usuários.
      </p>
    </div>
  );
}
