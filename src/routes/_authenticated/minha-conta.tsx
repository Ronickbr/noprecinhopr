import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/minha-conta")({
  head: () => ({ meta: [{ title: "Minha conta — PrecinhoBom" }, { name: "robots", content: "noindex" }] }),
  component: Layout,
});

function Layout() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/minha-conta/favoritos", label: "Favoritos" },
    { to: "/minha-conta/alertas", label: "Alertas" },
  ] as const;
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <h1 className="font-serif text-3xl font-semibold text-foreground">Minha conta</h1>
      <div className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${pathname === t.to ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
