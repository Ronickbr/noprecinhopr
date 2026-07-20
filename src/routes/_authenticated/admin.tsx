import { createFileRoute, redirect, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Store, Users, Tag, Package, CreditCard, Activity, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — PrecinhoBom" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/lojas", label: "Lojas", icon: Store },
  { to: "/admin/lojistas", label: "Lojistas", icon: Activity },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: Tag },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/planos", label: "Planos", icon: CreditCard },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-20 h-max rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 px-2 pb-3 border-b border-border">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Admin Panel
          </span>
        </div>
        <nav className="mt-3 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-2 h-9 px-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
