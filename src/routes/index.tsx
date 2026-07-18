import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getHomeData } from "@/lib/products.functions";
import { ProductCard } from "@/components/product-card";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: () => getHomeData(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrecinhoBom — o menor preço, calculado em tempo real" },
      {
        name: "description",
        content:
          "Compare preços de milhares de lojas em um lugar só. Histórico de 90 dias, alertas de queda e curadoria independente.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(homeQuery);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 space-y-20">
      {/* Hero */}
      <section className="relative">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-10 right-0 w-72 h-72 bg-success/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            SISTEMA DE MONITORAMENTO ATIVO
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter max-w-4xl leading-[0.95] text-foreground">
            O menor preço,{" "}
            <span className="text-gradient-tech">calculado em tempo real.</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg">
            Analisamos milhões de variações de preços em milhares de lojas para
            garantir que você nunca pague um centavo a mais.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/busca"
              search={{ sort: "price_asc", page: 1 }}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition glow-primary"
            >
              Explorar ofertas →
            </Link>
            <Link
              to="/lojista"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-md border border-border text-sm font-semibold text-foreground hover:bg-accent transition"
            >
              Sou lojista
            </Link>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="space-y-6">
        <div className="flex items-center gap-6">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            Categorias Base
          </h2>
          <div className="h-px flex-1 bg-border" />
          <Link
            to="/busca"
            search={{ sort: "price_asc", page: 1 }}
            className="text-xs font-mono uppercase tracking-widest text-primary hover:opacity-80"
          >
            Ver tudo →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {data.categories.slice(0, 11).map((c, i) => (
            <Link
              key={c.id}
              to="/categoria/$slug"
              params={{ slug: c.slug }}
              className="group cursor-pointer bg-card/60 border border-border p-5 rounded-xl hover:bg-card hover:border-primary/40 transition-all"
            >
              <div className="font-mono text-[10px] text-muted-foreground group-hover:text-primary transition-colors mb-2">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {c.name}
              </div>
            </Link>
          ))}
          <Link
            to="/busca"
            search={{ sort: "price_asc", page: 1 }}
            className="group cursor-pointer border border-dashed border-border p-5 rounded-xl hover:border-primary/40 transition-all flex flex-col items-start justify-between"
          >
            <div className="font-mono text-[10px] text-muted-foreground mb-2">++</div>
            <div className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">
              Ver mais
            </div>
          </Link>
        </div>
      </section>

      {/* Ofertas em alta */}
      <section className="space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-foreground">
              Ofertas em alta
            </h2>
            <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-2 uppercase tracking-widest">
              DATA_STREAM: TOP_VALUATED_DEALS
            </p>
          </div>
          <Link
            to="/busca"
            search={{ sort: "price_asc", page: 1 }}
            className="hidden sm:inline-flex px-4 py-2 bg-card border border-border rounded-md text-xs font-mono uppercase tracking-widest hover:bg-accent transition-colors"
          >
            Ver relatório completo
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      </section>
    </div>
  );
}
