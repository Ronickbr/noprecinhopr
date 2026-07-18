import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getProduct, toggleFavorite, createAlert, listFavorites } from "@/lib/products.functions";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { formatBRL, pctDiff } from "@/lib/format";
import { Heart, TrendingDown, ExternalLink, Bell, Store } from "lucide-react";
import { useUser } from "@/hooks/use-user";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProduct({ data: { slug } }),
  });

export const Route = createFileRoute("/produto/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Produto não encontrado" }, { name: "robots", content: "noindex" }] };
    const { product, stats } = loaderData;
    const title = `${product.name}${product.brand ? " · " + product.brand : ""} — PrecinhoBom`;
    const desc = stats.current_best
      ? `A partir de ${formatBRL(stats.current_best)}. Compare preços em várias lojas e veja o histórico de 90 dias.`
      : "Compare preços em várias lojas e veja o histórico de 90 dias.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(product.image_url ? [{ property: "og:image", content: product.image_url }] : []),
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-serif text-3xl">Produto não encontrado</h1>
      <Link to="/" className="mt-4 inline-block text-primary">Voltar</Link>
    </div>
  ),
});

function ProductPage() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(params.slug));
  const { user } = useUser();
  const qc = useQueryClient();

  const productId = data?.product.id;
  const favQuery = useQuery({
    queryKey: ["favorites"],
    queryFn: () => listFavorites(),
    enabled: !!user,
  });
  const favMut = useMutation({
    mutationFn: () => toggleFavorite({ data: { productId: productId! } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(r.favorited ? "Adicionado aos favoritos" : "Removido dos favoritos");
    },
    onError: () => toast.error("Entre para favoritar"),
  });

  const [alertPrice, setAlertPrice] = useState("");
  const alertMut = useMutation({
    mutationFn: () => createAlert({ data: { productId: productId!, targetPrice: Number(alertPrice) } }),
    onSuccess: () => {
      toast.success("Alerta criado! Vamos avisar quando o preço cair.");
      setAlertPrice("");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar o alerta"),
  });

  if (!data) return null;
  const { product, category, offers, history, stats } = data;
  const isFav = !!favQuery.data?.find((f) => f.product_id === product.id);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <nav className="text-xs text-muted-foreground mb-6">
        <Link to="/" className="hover:underline">Início</Link>
        {category ? (
          <>
            {" / "}
            <Link to="/categoria/$slug" params={{ slug: category.slug }} className="hover:underline">
              {category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-8 md:grid-cols-[380px_1fr]">
        <div className="aspect-square bg-card border border-border rounded-lg overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">sem imagem</div>
          )}
        </div>

        <div>
          {product.brand ? (
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{product.brand}</p>
          ) : null}
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold leading-tight text-foreground">
            {product.name}
          </h1>

          <div className="mt-6 p-5 rounded-lg border border-border bg-card">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Menor preço agora</p>
                <p className="mt-1 font-serif text-4xl font-semibold text-foreground">
                  {stats.current_best ? formatBRL(stats.current_best) : "—"}
                </p>
              </div>
              {stats.is_lowest && stats.current_best > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success text-success-foreground text-xs font-medium">
                  <TrendingDown className="h-3 w-3" /> Menor em 90 dias
                </span>
              ) : stats.lowest_90d > 0 ? (
                <span className="text-xs text-muted-foreground">
                  Mínimo em 90 dias: {formatBRL(stats.lowest_90d)}
                  {" "}({pctDiff(stats.current_best, stats.lowest_90d) > 0 ? "+" : ""}
                  {pctDiff(stats.current_best, stats.lowest_90d)}%)
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => favMut.mutate()}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm ${isFav ? "bg-destructive/10 border-destructive/30 text-destructive" : "border-input hover:bg-accent"}`}
              >
                <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                {isFav ? "Favoritado" : "Favoritar"}
              </button>
            </div>
          </div>

          {product.description ? (
            <p className="mt-6 text-foreground leading-relaxed">{product.description}</p>
          ) : null}
        </div>
      </div>

      {/* Offers */}
      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold text-foreground">Ofertas em {offers.length} loja{offers.length === 1 ? "" : "s"}</h2>
        <div className="mt-4 divide-y divide-border border border-border rounded-lg bg-card">
          {offers.map((o, i) => (
            <div key={o.id} className="flex items-center gap-4 p-4">
              {o.store?.slug ? (
                <Link
                  to="/loja/$slug"
                  params={{ slug: o.store.slug }}
                  className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 hover:ring-2 hover:ring-primary/40 transition"
                >
                  {o.store.logo_url ? (
                    <img src={o.store.logo_url} alt={o.store.name} className="w-10 h-10 object-contain" />
                  ) : (
                    <Store className="h-5 w-5 text-muted-foreground" />
                  )}
                </Link>
              ) : (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {o.store?.slug ? (
                  <Link
                    to="/loja/$slug"
                    params={{ slug: o.store.slug }}
                    className="font-medium text-foreground truncate hover:text-primary transition-colors"
                  >
                    {o.store.name}
                  </Link>
                ) : (
                  <p className="font-medium text-foreground truncate">Loja</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Confiança {Number(o.store?.trust_score ?? 0).toFixed(1)}/5 · atualizado {new Date(o.updated_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-serif text-xl font-semibold ${i === 0 ? "text-success" : "text-foreground"}`}>
                  {formatBRL(o.price_cents)}
                </p>
                {i === 0 ? <p className="text-[10px] uppercase text-success font-medium">melhor preço</p> : null}
              </div>
              <a
                href={`/api/public/track?offer=${o.id}`}
                target="_blank"
                rel="noopener sponsored"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Ir à loja <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
          {!offers.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma oferta disponível.</div>
          ) : null}
        </div>
      </section>

      {/* History */}
      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold text-foreground">Histórico de preços · 90 dias</h2>
        <p className="mt-1 text-sm text-muted-foreground">Menor preço observado por dia entre todas as lojas.</p>
        <div className="mt-4 p-4 rounded-lg border border-border bg-card">
          <PriceHistoryChart data={history} />
        </div>
      </section>

      {/* Alert */}
      <section className="mt-12 max-w-xl">
        <h2 className="font-serif text-2xl font-semibold text-foreground">Alerta de preço</h2>
        <p className="mt-1 text-sm text-muted-foreground">Avisamos por e-mail assim que o preço cair.</p>
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
            <input
              type="number"
              placeholder="Ex.: 999"
              value={alertPrice}
              onChange={(e) => setAlertPrice(e.target.value)}
              className="w-full h-11 pl-9 pr-3 rounded-full border border-input bg-card text-sm"
            />
          </div>
          <button
            onClick={() => (user ? alertMut.mutate() : toast.error("Entre para criar alertas"))}
            disabled={!alertPrice || alertMut.isPending}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Bell className="h-4 w-4" /> Criar alerta
          </button>
        </div>
      </section>
    </div>
  );
}
