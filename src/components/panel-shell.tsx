import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, LogOut, Sun, Moon, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PanelNavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
  params?: Record<string, string>;
};

export type PanelNavGroup = { section: string; items: PanelNavItem[] };

type PanelShellProps = {
  title: string;
  subtitle: string;
  accentIcon: React.ComponentType<{ className?: string }>;
  nav: PanelNavGroup[];
  storageKey: string;
  homeHref: string;
  children: ReactNode;
};

export function PanelShell({
  title,
  subtitle,
  accentIcon: AccentIcon,
  nav,
  storageKey,
  homeHref,
  children,
}: PanelShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem(storageKey) === "1") setCollapsed(true);
  }, [storageKey]);
  useEffect(() => {
    localStorage.setItem(storageKey, collapsed ? "1" : "0");
  }, [collapsed, storageKey]);

  const flat = nav.flatMap((g) => g.items);
  const current =
    flat.find((i) => (i.exact ? pathname === i.to : pathname === i.to || pathname.startsWith(i.to + "/")))?.label ??
    title;

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={`sticky top-0 h-screen shrink-0 border-r border-border/60 bg-card/50 backdrop-blur-sm transition-[width] duration-200 ease-out ${
          collapsed ? "w-[68px]" : "w-[248px]"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <AccentIcon className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-none">{title}</p>
              <p className="mt-0.5 truncate text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {subtitle}
              </p>
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
          {nav.map((group) => (
            <div key={group.section} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                  {group.section}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.to
                    : pathname === item.to || pathname.startsWith(item.to + "/");
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        params={item.params as never}
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <Link to={homeHref} className="hover:text-foreground">
              {subtitle}
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="truncate text-foreground">{current}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle storageKey={`${storageKey}-theme`} />
            <Link
              to="/"
              className="hidden h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              Ver site <ExternalLink className="h-3 w-3" />
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

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function ThemeToggle({ storageKey }: { storageKey: string }) {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    const isDark = saved ? saved === "dark" : document.documentElement.classList.contains("dark");
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, [storageKey]);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(storageKey, next ? "dark" : "light");
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
