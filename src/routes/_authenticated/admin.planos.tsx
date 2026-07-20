import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMerchantPlansForAdmin } from "@/lib/products.functions";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  component: PlansPage,
});

function PlansPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-plans-view"], queryFn: () => listMerchantPlansForAdmin(), retry: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Planos de lojistas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tiers disponíveis para assinatura.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span className="text-[10px] font-mono uppercase tracking-widest">{p.slug}</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold">{p.name}</h3>
              <p className="mt-3 font-mono text-2xl">
                R$ {(p.price_cents / 100).toFixed(2).replace(".", ",")}
                <span className="text-xs text-muted-foreground">/mês</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Limite: {p.max_products ? `${p.max_products} produtos` : "ilimitado"}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Para atribuir planos individualmente, use a página de <a href="/admin/lojas" className="text-primary hover:underline">Lojas</a>.
      </p>
    </div>
  );
}
