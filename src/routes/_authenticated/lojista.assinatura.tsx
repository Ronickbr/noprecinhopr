import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import {
  listPlans,
  getMySubscription,
  subscribeToPlan,
  cancelMySubscription,
} from "@/lib/subscriptions.functions";
import { useConfirm } from "@/components/admin/confirm-dialog";

export const Route = createFileRoute("/_authenticated/lojista/assinatura")({
  head: () => ({
    meta: [{ title: "Assinatura do lojista — PrecinhoBom" }, { name: "robots", content: "noindex" }],
  }),
  component: AssinaturaPage,
});

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AssinaturaPage() {
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const { data: plans = [] } = useQuery({ queryKey: ["merchant-plans"], queryFn: () => listPlans() });
  const { data: sub } = useQuery({ queryKey: ["my-subscription"], queryFn: () => getMySubscription() });

  const subscribe = useMutation({
    mutationFn: (plan_id: string) => subscribeToPlan({ data: { plan_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
      toast.success("Plano ativado! 30 dias grátis começaram agora.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: () => cancelMySubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
      toast.success("Assinatura cancelada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentPlanId = sub?.plan_id;
  const isTrialing = sub?.status === "trialing";
  const isActive = sub?.status === "active";
  const isCanceled = sub?.status === "canceled";
  const trialLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400_000))
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary">// billing</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">Planos do lojista</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Primeiro mês grátis em qualquer plano. Cancele quando quiser.
          </p>
        </div>
        <Link
          to="/lojista"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar ao painel
        </Link>
      </div>

      {sub ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className={`h-2 w-2 rounded-full ${
                isActive || isTrialing ? "bg-success animate-pulse" : "bg-muted-foreground"
              }`}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Plano atual: <span className="font-mono">{sub.plan?.name}</span>
                {isTrialing ? (
                  <span className="ml-2 text-xs font-mono uppercase text-primary">
                    trial · {trialLeft}d restantes
                  </span>
                ) : isActive ? (
                  <span className="ml-2 text-xs font-mono uppercase text-success">ativo</span>
                ) : isCanceled ? (
                  <span className="ml-2 text-xs font-mono uppercase text-muted-foreground">cancelado</span>
                ) : null}
              </p>
              {sub.current_period_end ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Próxima renovação:{" "}
                  {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
                </p>
              ) : null}
            </div>
          </div>
          {(isActive || isTrialing) && (
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: "Cancelar assinatura?",
                  description: "Você perde acesso ao envio de catálogo ao final do período atual.",
                  confirmLabel: "Cancelar assinatura",
                  destructive: true,
                });
                if (ok) cancel.mutate();
              }}
              className="text-xs font-mono uppercase text-muted-foreground hover:text-destructive"
            >
              Cancelar assinatura
            </button>
          )}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const featured = p.slug === "pro";
          const isCurrent = p.id === currentPlanId && (isActive || isTrialing);
          return (
            <div
              key={p.id}
              className={`relative rounded-xl border p-6 flex flex-col ${
                featured
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card"
              }`}
            >
              {featured && (
                <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-widest">
                  <Sparkles className="h-3 w-3" /> mais popular
                </div>
              )}
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {p.slug}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-foreground">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-extrabold text-foreground">
                  {formatBRL(p.price_cents)}
                </span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.max_products ? `Até ${p.max_products} produtos` : "Produtos ilimitados"}
              </p>

              <ul className="mt-5 space-y-2 flex-1">
                {(p.features as string[]).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 mt-0.5 text-success shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => subscribe.mutate(p.id)}
                disabled={subscribe.isPending || isCurrent}
                className={`mt-6 h-11 rounded-full text-sm font-medium transition ${
                  isCurrent
                    ? "bg-muted text-muted-foreground cursor-default"
                    : featured
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                } disabled:opacity-50`}
              >
                {isCurrent
                  ? "Plano atual"
                  : sub
                    ? "Mudar para este plano"
                    : "Começar 30 dias grátis"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center">
        Cobrança recorrente ainda não integrada — assinatura em modo simulado. Após o período grátis o status vira{" "}
        <span className="font-mono">active</span> até você cancelar.
      </p>
    </div>
  );
}
