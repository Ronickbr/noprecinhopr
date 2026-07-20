import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListStores,
  adminSetStoreStatus,
  adminDeleteStore,
  adminSetTrustScore,
  adminListMerchants,
  adminSetSubscription,
  adminGrantRole,
  listMerchantPlansForAdmin,
} from "@/lib/products.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ShieldCheck, ShieldX, Star, CreditCard, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/lojas")({
  head: () => ({ meta: [{ title: "Admin — PrecinhoBom" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => adminListStores(),
    retry: false,
  });
  const { data: merchants } = useQuery({
    queryKey: ["admin-merchants"],
    queryFn: () => adminListMerchants(),
    retry: false,
  });
  const { data: plans } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: () => listMerchantPlansForAdmin(),
    retry: false,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-stores"] });
    qc.invalidateQueries({ queryKey: ["admin-merchants"] });
  };

  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: "pending" | "approved" | "suspended" }) =>
      adminSetStoreStatus({ data: vars }),
    onSuccess: () => { invalidateAll(); toast.success("Status atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteStore({ data: { id } }),
    onSuccess: () => { invalidateAll(); toast.success("Loja excluída"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setTrust = useMutation({
    mutationFn: (vars: { id: string; trust_score: number }) => adminSetTrustScore({ data: vars }),
    onSuccess: () => { invalidateAll(); toast.success("Confiança atualizada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setSub = useMutation({
    mutationFn: (vars: { user_id: string; plan_id: string | null; status: "trialing" | "active" | "canceled" | "past_due" | "expired" }) =>
      adminSetSubscription({ data: vars }),
    onSuccess: () => { invalidateAll(); toast.success("Assinatura atualizada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const grantRole = useMutation({
    mutationFn: (vars: { user_id: string; role: "admin" | "merchant" | "user"; action: "grant" | "revoke" }) =>
      adminGrantRole({ data: vars }),
    onSuccess: () => { invalidateAll(); toast.success("Papel atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        Você não tem acesso ao painel de administração.
      </div>
    );
  }

  const ownerByStore = new Map((merchants ?? []).map((m) => [m.id, m.owner]));
  const subByStore = new Map((merchants ?? []).map((m) => [m.id, m.subscription]));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Administração de lojas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aprove, suspenda, ajuste confiança, gerencie assinaturas e papéis.</p>
        </div>
        <a href="/admin/lojistas" className="text-xs font-mono uppercase tracking-widest text-primary hover:underline">
          Monitorar lojistas →
        </a>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase font-mono tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Loja</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Confiança</th>
              <th className="px-4 py-3 font-medium">Assinatura</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>
            ) : (
              data?.map((s) => {
                const owner = ownerByStore.get(s.id) ?? null;
                const sub = subByStore.get(s.id) ?? null;
                return (
                  <tr key={s.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">/{s.slug}</p>
                      {owner ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{owner.display_name ?? "—"}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={s.status}
                        onChange={(e) => setStatus.mutate({ id: s.id, status: e.target.value as "pending" | "approved" | "suspended" })}
                        className="h-8 px-2 rounded border border-input bg-background text-xs"
                      >
                        <option value="pending">pending</option>
                        <option value="approved">approved</option>
                        <option value="suspended">suspended</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <TrustEditor
                        current={Number(s.trust_score)}
                        onSave={(v) => setTrust.mutate({ id: s.id, trust_score: v })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {owner ? (
                        <SubscriptionEditor
                          plans={plans ?? []}
                          current={sub}
                          onChange={(vars) => setSub.mutate({ user_id: owner.id, ...vars })}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">sem dono</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {s.status !== "approved" ? (
                          <button
                            onClick={() => setStatus.mutate({ id: s.id, status: "approved" })}
                            className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Aprovar
                          </button>
                        ) : null}
                        {s.status !== "suspended" ? (
                          <button
                            onClick={() => setStatus.mutate({ id: s.id, status: "suspended" })}
                            className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                          >
                            <ShieldX className="h-3.5 w-3.5" /> Suspender
                          </button>
                        ) : null}
                        {owner ? (
                          <RoleMenu ownerId={owner.id} onAction={(role, action) => grantRole.mutate({ user_id: owner.id, role, action })} />
                        ) : null}
                        <button
                          onClick={() => {
                            if (confirm(`Excluir loja "${s.name}"? Isso remove todas as ofertas.`)) remove.mutate(s.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrustEditor({ current, onSave }: { current: number; onSave: (v: number) => void }) {
  const [value, setValue] = useState(current.toFixed(1));
  return (
    <div className="inline-flex items-center gap-1.5">
      <Star className="h-3.5 w-3.5 text-muted-foreground" />
      <input
        type="number"
        step="0.1"
        min={0}
        max={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const n = Number(value);
          if (!Number.isNaN(n) && n !== current) onSave(Math.min(5, Math.max(0, n)));
        }}
        className="w-14 h-8 px-2 rounded border border-input bg-background text-xs font-mono"
      />
    </div>
  );
}

function SubscriptionEditor({
  plans,
  current,
  onChange,
}: {
  plans: Array<{ id: string; slug: string; name: string }>;
  current: { status: string; plan: { name: string } | null } | null;
  onChange: (vars: { plan_id: string | null; status: "trialing" | "active" | "canceled" | "past_due" | "expired" }) => void;
}) {
  const [planId, setPlanId] = useState<string>("");
  const [status, setStatus] = useState<"trialing" | "active" | "canceled" | "past_due" | "expired">(
    (current?.status as "trialing" | "active" | "canceled" | "past_due" | "expired" | undefined) ?? "trialing",
  );
  return (
    <div className="space-y-1.5">
      <p className="text-xs">
        <CreditCard className="inline h-3 w-3 mr-1" />
        {current?.plan?.name ?? "—"} <span className="text-muted-foreground">({current?.status ?? "sem plano"})</span>
      </p>
      <div className="flex gap-1">
        <select
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="h-7 px-1.5 rounded border border-input bg-background text-xs"
        >
          <option value="">Plano…</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="h-7 px-1.5 rounded border border-input bg-background text-xs"
        >
          <option value="trialing">trialing</option>
          <option value="active">active</option>
          <option value="canceled">canceled</option>
          <option value="past_due">past_due</option>
          <option value="expired">expired</option>
        </select>
        <button
          onClick={() => onChange({ plan_id: planId || null, status })}
          className="text-xs px-2 h-7 rounded bg-primary text-primary-foreground hover:opacity-90"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

function RoleMenu({
  ownerId,
  onAction,
}: {
  ownerId: string;
  onAction: (role: "admin" | "merchant" | "user", action: "grant" | "revoke") => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <UserCog className="h-3.5 w-3.5" /> Papéis
      </button>
      {open ? (
        <div className="absolute z-10 mt-1 w-40 rounded-md border border-border bg-popover shadow-lg text-xs" onMouseLeave={() => setOpen(false)}>
          {(["admin", "merchant", "user"] as const).map((role) => (
            <div key={role} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent">
              <span className="font-mono">{role}</span>
              <div className="flex gap-1.5">
                <button className="text-success hover:underline" onClick={() => { onAction(role, "grant"); setOpen(false); }}>+</button>
                <button className="text-destructive hover:underline" onClick={() => { onAction(role, "revoke"); setOpen(false); }}>−</button>
              </div>
            </div>
          ))}
          <p className="px-2 py-1 text-[10px] text-muted-foreground border-t border-border font-mono truncate">{ownerId.slice(0, 8)}…</p>
        </div>
      ) : null}
    </div>
  );
}
