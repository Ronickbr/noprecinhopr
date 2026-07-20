import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Store, Users, Package, Tag, Layers, Sparkles, Map, Inbox, Flag,
  BarChart3, ScrollText, ShieldCheck, Settings, Wallet, ChevronLeft, ChevronRight,
  Search, Sun, Moon, LogOut, Bell, Command,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; badge?: string };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Principal",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    section: "Catálogo",
    items: [
      { to: "/admin/lojas", label: "Lojas", icon: Store },
      { to: "/admin/produtos", label: "Produtos", icon: Package },
      { to: "/admin/categorias", label: "Categorias", icon: Tag },
      { to: "/admin/subcategorias", label: "Subcategorias", icon: Layers },
      { to: "/admin/marcas", label: "Marcas", icon: Sparkles },
      { to: "/admin/ofertas", label: "Ofertas", icon: BarChart3 },
      { to: "/admin/regioes", label: "Regiões", icon: Map },
    ],
  },
  {
    section: "Moderação",
    items: [
      { to: "/admin/solicitacoes", label: "Solicitações", icon: Inbox },
      { to: "/admin/denuncias", label: "Denúncias", icon: Flag },
    ],
  },
  {
    section: "Análise",
    items: [
      { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/admin/logs", label: "Logs", icon: ScrollText },
    ],
  },
  {
    section: "Sistema",
    items: [
      { to: "/admin/usuarios", label: "Usuários", icon: Users },
      { to: "/admin/permissoes", label: "Permissões", icon: ShieldCheck },
      { to: "/admin/planos", label: "Planos", icon: Wallet },
      { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
      { to: "/admin/financeiro", label: "Financeiro", icon: Wallet, badge: "em breve" },
    ],
  },
];

const CRUMB_LABELS: Record<string, string> = Object.fromEntries(
  NAV.flatMap((s) => s.items).map((i) => [i.to, i.label]),
);

export function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const currentLabel = CRUMB_LABELS[pathname] ?? "Admin";

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`sticky top-0 h-screen shrink-0 border-r border-border/60 bg-card/50 backdrop-blur-sm transition-[width] duration-200 ease-out ${
          collapsed ? "w-[68px]" : "w-[248px]"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-none">PrecinhoBom</p>
              <p className="mt-0.5 truncate text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Recolher menu"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="h-[calc(100vh-3.5rem)] overflow-y-auto px-2 py-3">
          {NAV.map((group) => (
            <div key={group.section} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                  {group.section}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={`group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors ${
                          active
                            ? "bg-primary/12 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">
                                {item.badge}
                              </span>
                            )}
                            {active && !item.badge && (
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <Link to="/admin" className="hover:text-foreground">Admin</Link>
            {pathname !== "/admin" && (
              <>
                <span className="text-muted-foreground/50">/</span>
                <span className="truncate text-foreground">{currentLabel}</span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <GlobalSearch />
            <ThemeToggle />
            <button className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Notificações">
              <Bell className="h-4 w-4" />
            </button>
            <Link
              to="/"
              className="hidden h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              Ver site ↗
            </Link>
            <button
              onClick={signOut}
              className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 items-center gap-2 rounded-md border border-border/60 bg-card/50 px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground md:inline-flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Buscar…</span>
        <kbd className="ml-6 inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px]">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 pt-24 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) {
                    setOpen(false);
                    navigate({ to: "/admin/produtos", search: { q } as never });
                  }
                }}
                placeholder="Buscar produtos, lojas, usuários…"
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {[
                { to: "/admin/produtos", label: "Ir para produtos", icon: Package },
                { to: "/admin/lojas", label: "Ir para lojas", icon: Store },
                { to: "/admin/usuarios", label: "Ir para usuários", icon: Users },
                { to: "/admin/categorias", label: "Ir para categorias", icon: Tag },
                { to: "/admin/solicitacoes", label: "Ir para solicitações", icon: Inbox },
              ].map((s) => (
                <button
                  key={s.to}
                  onClick={() => { setOpen(false); navigate({ to: s.to }); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("admin-theme");
    const isDark = saved ? saved === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("admin-theme", next ? "dark" : "light");
  }
  return (
    <button
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="Alternar tema"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
