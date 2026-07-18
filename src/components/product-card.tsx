import { Link } from "@tanstack/react-router";
import { formatBRL } from "@/lib/format";

interface Props {
  slug: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  best_price_cents: number;
  offer_count: number;
}

export function ProductCard(p: Props) {
  return (
    <Link
      to="/produto/$slug"
      params={{ slug: p.slug }}
      className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors"
    >
      <div className="aspect-square bg-muted overflow-hidden">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            sem imagem
          </div>
        )}
      </div>
      <div className="p-3">
        {p.brand ? (
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.brand}</p>
        ) : null}
        <h3 className="mt-0.5 text-sm font-medium text-foreground line-clamp-2 min-h-10">{p.name}</h3>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="font-serif text-lg font-semibold text-foreground">
            {p.best_price_cents ? formatBRL(p.best_price_cents) : "—"}
          </p>
          {p.offer_count > 0 ? (
            <span className="text-[11px] text-muted-foreground">
              {p.offer_count} {p.offer_count === 1 ? "loja" : "lojas"}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
