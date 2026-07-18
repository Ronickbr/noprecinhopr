import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { searchProducts, listCategories } from "@/lib/products.functions";
import { ProductCard } from "@/components/product-card";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  sort: z.enum(["price_asc", "price_desc", "recent"]).default("price_asc"),
  page: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute("/busca")({
  head: () => ({
    meta: [
      { title: "Buscar produtos — PrecinhoBom" },
      { name: "description", content: "Compare preços de milhares de produtos em um só lugar." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: searchSchema,
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const productsQuery = useQuery({
    queryKey: ["search", search],
    queryFn: () =>
      searchProducts({
        data: {
          q: search.q ?? "",
          categorySlug: search.category ?? null,
          minPrice: search.min ?? null,
          maxPrice: search.max ?? null,
          sort: search.sort,
          page: search.page,
        },
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

  const update = (patch: Partial<typeof search>) =>
    navigate({ to: ".", search: (prev) => ({ ...prev, ...patch, page: 1 }) });

  const totalPages = productsQuery.data ? Math.ceil(productsQuery.data.total / productsQuery.data.pageSize) : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid gap-8 md:grid-cols-[220px_1fr]">
      <aside className="space-y-6 text-sm">
        <div>
          <p className="font-medium text-foreground mb-2">Categorias</p>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => update({ category: undefined })}
                className={`text-left w-full py-1 hover:text-primary ${!search.category ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                Todas
              </button>
            </li>
            {categoriesQuery.data?.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => update({ category: c.slug })}
                  className={`text-left w-full py-1 hover:text-primary ${search.category === c.slug ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground mb-2">Preço (R$)</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="min"
              defaultValue={search.min ?? ""}
              onBlur={(e) => update({ min: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full h-9 px-2 rounded border border-input bg-card text-sm"
            />
            <input
              type="number"
              placeholder="max"
              defaultValue={search.max ?? ""}
              onBlur={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full h-9 px-2 rounded border border-input bg-card text-sm"
            />
          </div>
        </div>
      </aside>

      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {productsQuery.data ? (
              <>
                <span className="font-medium text-foreground">{productsQuery.data.total}</span> resultados
                {search.q ? <> para “{search.q}”</> : null}
              </>
            ) : (
              "Buscando…"
            )}
          </p>
          <select
            value={search.sort}
            onChange={(e) => navigate({ to: ".", search: (p) => ({ ...p, sort: e.target.value as typeof search.sort }) })}
            className="h-9 px-3 rounded border border-input bg-card text-sm"
          >
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="recent">Mais recentes</option>
          </select>
        </div>

        {productsQuery.data?.items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhum produto encontrado. Tente ampliar o filtro.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {productsQuery.data?.items.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-8 flex justify-center gap-2 text-sm">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                to="/busca"
                search={{ ...search, page: n }}
                className={`px-3 py-1.5 rounded border ${n === search.page ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"}`}
              >
                {n}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
