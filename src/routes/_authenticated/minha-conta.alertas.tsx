import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAlerts, deleteAlert } from "@/lib/products.functions";
import { formatBRL } from "@/lib/format";
import { Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/minha-conta/alertas")({
  component: AlertsPage,
});

function AlertsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["alerts"], queryFn: () => listAlerts() });
  const del = useMutation({
    mutationFn: (id: string) => deleteAlert({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alerta removido");
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data?.length)
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto opacity-40" />
        <p className="mt-3">Nenhum alerta ativo. Crie na página do produto.</p>
      </div>
    );

  return (
    <ul className="divide-y divide-border border border-border rounded-lg bg-card">
      {data.map((a) => {
        const p = a.products;
        return (
          <li key={a.id} className="flex items-center gap-4 p-4">
            <div className="w-14 h-14 bg-muted rounded overflow-hidden shrink-0">
              {p?.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="flex-1 min-w-0">
              {p ? (
                <Link to="/produto/$slug" params={{ slug: p.slug }} className="font-medium hover:text-primary">
                  {p.name}
                </Link>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Avisar quando ficar abaixo de{" "}
                <span className="font-medium text-foreground">{formatBRL(a.target_price_cents)}</span>
              </p>
            </div>
            <button onClick={() => del.mutate(a.id)} className="text-sm text-destructive hover:underline">
              Remover
            </button>
          </li>
        );
      })}
    </ul>
  );
}
