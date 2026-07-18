import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getHomeData } from "@/lib/products.functions";
import { ProductCard } from "@/components/product-card";
import { TrendingUp, ShieldCheck, LineChart as LineIcon } from "lucide-react";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: () => getHomeData(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrecinhoBom — o menor preço, com histórico e alertas" },
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
    <div>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 grid gap-8 md:grid-cols-[1.4fr_1fr] items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Edição de hoje · Curadoria independente
            </p>
            <h1 className="mt-4 font-serif text-5xl sm:text-6xl font-semibold leading-[1.05] tracking-tight text-foreground">
              O menor preço.<br />
              <span className="text-primary">Sem enrolação.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              Comparamos ofertas de milhares de lojas, guardamos 90 dias de
              histórico e avisamos quando o preço cai. Nunca cobramos por
              posição.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/busca"
                search={{ sort: "price_asc", page: 1 }}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Explorar ofertas
              </Link>
              <Link
                to="/lojista"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-input text-sm font-medium hover:bg-accent"
              >
                Sou lojista
              </Link>
            </div>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex gap-3 p-4 rounded-lg bg-card border border-border">
              <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Melhor preço, sempre</p>
                <p className="text-muted-foreground">Ordenamos por preço, não por patrocínio.</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-lg bg-card border border-border">
              <LineIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Histórico de 90 dias</p>
                <p className="text-muted-foreground">Descubra se é hora de comprar ou esperar.</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-lg bg-card border border-border">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Lojas verificadas</p>
                <p className="text-muted-foreground">Trust score público, sem enrolação.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-semibold text-foreground">Categorias</h2>
          <Link to="/busca" search={{ sort: "price_asc", page: 1 }} className="text-sm text-primary hover:underline">
            Ver tudo →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.categories.map((c) => (
            <Link
              key={c.id}
              to="/categoria/$slug"
              params={{ slug: c.slug }}
              className="p-4 rounded-lg bg-card border border-border hover:border-primary/40"
            >
              <p className="font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Explorar →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Destaque da semana
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-foreground">
              Ofertas em alta
            </h2>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      </section>
    </div>
  );
}
