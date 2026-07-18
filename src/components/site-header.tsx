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
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center gap-4 sm:gap-6">
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <span className="w-6 h-6 rounded-sm bg-primary glow-primary" />
          <span className="text-lg font-extrabold tracking-tighter text-foreground uppercase">
            Precinho<span className="text-primary">Bom</span>
          </span>
        </Link>

        <form onSubmit={onSearch} className="flex-1 max-w-2xl relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar produtos, marcas e mais..."
            className="w-full h-10 pl-10 pr-14 rounded-lg bg-card border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted border border-border rounded">
            CMD+K
          </kbd>
        </form>

        <nav className="hidden sm:flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link
                to="/minha-conta/favoritos"
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Favoritos"
              >
                <Heart className="h-4 w-4" />
              </Link>
              <Link
                to="/minha-conta/alertas"
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Alertas de preço"
              >
                <Bell className="h-4 w-4" />
              </Link>
              <Link
                to="/lojista"
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Painel do lojista"
              >
                <Store className="h-4 w-4" />
              </Link>
            </>
          ) : null}
          <Link
            to="/auth"
            className="ml-1 inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 transition"
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
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-sm bg-primary" />
            <p className="text-base font-extrabold tracking-tighter uppercase text-foreground">
              Precinho<span className="text-primary">Bom</span>
            </p>
          </div>
          <p className="mt-3 text-muted-foreground">
            Comparador de preços independente. Nunca pagamos por posição. Vale
            informação, não patrocínio.
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            SYS_STATUS: OPERATIONAL
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Explorar</p>
          <ul className="mt-3 space-y-1.5 text-muted-foreground">
            <li><Link to="/busca" search={{ sort: "price_asc", page: 1 }} className="hover:text-foreground">Todos os produtos</Link></li>
            <li><Link to="/lojista" className="hover:text-foreground">Sou lojista</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Sobre</p>
          <p className="mt-3 text-muted-foreground">
            Preços coletados diariamente. Podemos receber comissão em algumas
            compras — nunca por posicionamento.
          </p>
        </div>
      </div>
    </footer>
  );
}
