import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Heart, Bell, ShieldCheck, UserCircle } from "lucide-react";
import { PanelShell, type PanelNavGroup } from "@/components/panel-shell";

export const Route = createFileRoute("/_authenticated/minha-conta")({
  head: () => ({ meta: [{ title: "Minha conta — PrecinhoBom" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/minha-conta" || location.pathname === "/minha-conta/") {
      throw redirect({ to: "/minha-conta/favoritos" });
    }
  },
  component: Layout,
});

const NAV: PanelNavGroup[] = [
  {
    section: "Conta",
    items: [
      { to: "/minha-conta/favoritos", label: "Favoritos", icon: Heart },
      { to: "/minha-conta/alertas", label: "Alertas de preço", icon: Bell },
    ],
  },
  {
    section: "Segurança",
    items: [
      { to: "/minha-conta/privacidade", label: "Privacidade", icon: ShieldCheck },
    ],
  },
];

function Layout() {
  return (
    <PanelShell
      title="PrecinhoBom"
      subtitle="Minha conta"
      accentIcon={UserCircle}
      nav={NAV}
      storageKey="conta-sidebar-collapsed"
      homeHref="/minha-conta/favoritos"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <Outlet />
      </div>
    </PanelShell>
  );
}
