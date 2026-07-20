import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Store, CreditCard, LayoutDashboard } from "lucide-react";
import { PanelShell, type PanelNavGroup } from "@/components/panel-shell";

export const Route = createFileRoute("/_authenticated/lojista")({
  head: () => ({ meta: [{ title: "Painel do lojista — PrecinhoBom" }, { name: "robots", content: "noindex" }] }),
  component: LojistaLayout,
});

const NAV: PanelNavGroup[] = [
  {
    section: "Loja",
    items: [
      { to: "/lojista", label: "Painel", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    section: "Financeiro",
    items: [
      { to: "/lojista/assinatura", label: "Assinatura", icon: CreditCard },
    ],
  },
];

function LojistaLayout() {
  return (
    <PanelShell
      title="PrecinhoBom"
      subtitle="Lojista"
      accentIcon={Store}
      nav={NAV}
      storageKey="lojista-sidebar-collapsed"
      homeHref="/lojista"
    >
      <Outlet />
    </PanelShell>
  );
}
