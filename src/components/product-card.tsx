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
      className="group block bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all"
    >
      <div className="aspect-square bg-background/40 border-b border-border overflow-hidden relative">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-mono">
            NO_IMAGE
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          {p.brand ? (
            <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground truncate">
              {p.brand}
            </p>
          ) : <span />}
          {p.offer_count > 0 ? (
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {p.offer_count} {p.offer_count === 1 ? "loja" : "lojas"}
            </span>
          ) : null}
        </div>
        <h3 className="text-sm font-medium text-foreground line-clamp-2 min-h-10 leading-tight group-hover:text-primary transition-colors">
          {p.name}
        </h3>
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            A partir de
          </p>
          <p className="mt-0.5 font-mono text-xl font-bold tracking-tighter text-foreground">
            {p.best_price_cents ? formatBRL(p.best_price_cents) : "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}
