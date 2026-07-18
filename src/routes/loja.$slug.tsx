import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { Store as StoreIcon, ShieldCheck } from "lucide-react";

import { getStoreBySlug } from "@/lib/products.functions";
import { ProductCard } from "@/components/product-card";

const searchSchema = z.object({
  sort: z.enum(["price_asc", "price_desc", "recent"]).default("price_asc"),
  page: z.number().int().min(1).max(200).default(1),
});

const storeQuery = (slug: string, sort: "price_asc" | "price_desc" | "recent", page: number) =>
  queryOptions({
    queryKey: ["store", slug, sort, page],
    queryFn: () => getStoreBySlug({ data: { slug, sort, page } }),
  });

export const Route = createFileRoute("/loja/$slug")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ sort: search.sort, page: search.page }),
  loader: async ({ params, deps, context }) => {
    const data = await context.queryClient.ensureQueryData(storeQuery(params.slug, deps.sort, deps.page));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Loja não encontrada" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.store.name} — ofertas e produtos`;
    const desc = `Veja todos os produtos e preços da loja ${loaderData.store.name} no PrecinhoBom.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-serif text-2xl">Erro ao carregar loja</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-serif text-2xl">Loja não encontrada</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-primary underline">Voltar ao início</Link>
    </div>
  ),
  component: StorePage,
});

function StorePage() {
  const { slug } = Route.useParams();
  const { sort, page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(storeQuery(slug, sort, page));
  if (!data) return null;
  const { store, featured, items, total, offers_total, pageSize } = data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <header className="flex items-start gap-5 pb-8 border-b border-border">
        <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="w-16 h-16 object-contain" />
          ) : (
            <StoreIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Loja parceira</p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl font-semibold text-foreground">{store.name}</h1>
          {store.description ? (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{store.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Confiança {Number(store.trust_score ?? 0).toFixed(1)}/5
            </span>
            <span>{offers_total} ofertas ativas</span>
            <span>{total} produtos</span>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center justify-between py-6">
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "produto" : "produtos"}
        </p>
        <select
          value={sort}
          onChange={(e) =>
            navigate({
              search: { sort: e.target.value as typeof sort, page: 1 },
            })
          }
          className="h-9 rounded-md border border-border bg-card px-3 text-sm"
        >
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
          <option value="recent">Mais recentes</option>
        </select>
      </div>

      {/* Grid */}
      {items.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          Esta loja ainda não possui produtos publicados.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="mt-10 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => navigate({ search: { sort, page: page - 1 } })}
            className="h-9 px-3 rounded-md border border-border bg-card text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-muted-foreground font-mono">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => navigate({ search: { sort, page: page + 1 } })}
            className="h-9 px-3 rounded-md border border-border bg-card text-sm disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      ) : null}
    </div>
  );
}
