import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFavorites, toggleFavorite } from "@/lib/products.functions";
import { Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/minha-conta/favoritos")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => listFavorites(),
  });
  const remove = useMutation({
    mutationFn: (productId: string) => toggleFavorite({ data: { productId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Removido");
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data?.length)
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Heart className="h-8 w-8 mx-auto opacity-40" />
        <p className="mt-3">Você ainda não tem favoritos.</p>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          Explorar produtos
        </Link>
      </div>
    );

  return (
    <ul className="divide-y divide-border border border-border rounded-lg bg-card">
      {data.map((f) => {
        const p = f.products;
        if (!p) return null;
        return (
          <li key={f.product_id} className="flex items-center gap-4 p-4">
            <div className="w-14 h-14 bg-muted rounded overflow-hidden shrink-0">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="flex-1 min-w-0">
              <Link to="/produto/$slug" params={{ slug: p.slug }} className="font-medium hover:text-primary">
                {p.name}
              </Link>
              {p.brand ? <p className="text-xs text-muted-foreground">{p.brand}</p> : null}
            </div>
            <button
              onClick={() => remove.mutate(p.id)}
              className="text-sm text-destructive hover:underline"
            >
              Remover
            </button>
          </li>
        );
      })}
    </ul>
  );
}
