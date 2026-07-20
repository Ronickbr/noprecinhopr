import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  component: () => (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Faturas, MRR, churn, receita por plano." />
      <div className="grid place-items-center rounded-xl border border-dashed border-border/60 bg-card/40 py-24 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold">Em breve — Fase 4</p>
          <p className="mt-1 text-xs text-muted-foreground">Dependente de integração completa de pagamentos.</p>
        </div>
      </div>
    </div>
  ),
});
