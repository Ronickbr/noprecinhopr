import { Link } from "@tanstack/react-router";
import { Search, User as UserIcon, Heart, Bell, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUser } from "@/hooks/use-user";

export function SiteHeader() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { user } = useUser();

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    navigate({ to: "/busca", search: { q: query || undefined, sort: "price_asc", page: 1 } });
  }

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center gap-4 sm:gap-6">
        <Link to="/" className="shrink-0 flex items-baseline gap-1.5">
          <span className="font-serif text-2xl font-semibold tracking-tight text-primary">
            Precinho
          </span>
          <span className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Bom
          </span>
        </Link>

        <form onSubmit={onSearch} className="flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busque produtos, marcas ou lojas"
            className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </form>

        <nav className="hidden sm:flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link
                to="/minha-conta/favoritos"
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Favoritos"
              >
                <Heart className="h-4 w-4" />
              </Link>
              <Link
                to="/minha-conta/alertas"
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Alertas de preço"
              >
                <Bell className="h-4 w-4" />
              </Link>
              <Link
                to="/lojista"
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Painel do lojista"
              >
                <Store className="h-4 w-4" />
              </Link>
            </>
          ) : null}
          <Link
            to="/auth"
            className="ml-1 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium text-primary-foreground bg-primary hover:opacity-90"
          >
            <UserIcon className="h-3.5 w-3.5" />
            {user ? "Conta" : "Entrar"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <p className="font-serif text-lg font-semibold text-foreground">PrecinhoBom</p>
          <p className="mt-2 text-muted-foreground">
            Comparador de preços independente. Nunca pagamos por posição. Vale
            informação, não patrocínio.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">Explore</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li><Link to="/busca" search={{ sort: "price_asc", page: 1 }}>Todos os produtos</Link></li>
            <li><Link to="/lojista">Sou lojista</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground">Sobre</p>
          <p className="mt-2 text-muted-foreground">
            Preços coletados diariamente. Podemos receber comissão em algumas
            compras — nunca por posicionamento.
          </p>
        </div>
      </div>
    </footer>
  );
}
