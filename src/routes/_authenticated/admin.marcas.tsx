import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/marcas")({
  component: () => (
    <div className="space-y-6">
      <PageHeader title="Marcas" description="Gestão completa de marcas com logos, países de origem e associação a produtos." />
      <div className="grid place-items-center rounded-xl border border-dashed border-border/60 bg-card/40 py-24 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Construction className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold">Em construção — Fase 2</p>
          <p className="mt-1 text-xs text-muted-foreground">Migração de schema pendente.</p>
        </div>
      </div>
    </div>
  ),
});
