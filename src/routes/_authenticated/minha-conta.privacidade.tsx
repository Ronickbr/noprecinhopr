import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { deleteMyAccount } from "@/lib/legal.functions";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/minha-conta/privacidade")({
  component: PrivacyAccountPage,
});

function PrivacyAccountPage() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (confirm !== "EXCLUIR") {
      toast.error('Digite EXCLUIR para confirmar.');
      return;
    }
    setLoading(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      toast.success("Sua conta foi excluída.");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir a conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-xl font-semibold text-foreground">Seus dados (LGPD)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Você é titular dos seus dados pessoais. Pode acessar, corrigir, exportar ou excluir a
          qualquer momento. Leia nossa{" "}
          <a href="/privacidade" className="text-primary hover:underline">Política de Privacidade</a>.
        </p>
      </section>

      <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="font-serif text-xl font-semibold text-destructive">Excluir minha conta</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta ação é <strong>permanente</strong>. Removeremos seus favoritos, alertas, perfil
              e histórico. Assinaturas ativas de lojista precisam ser canceladas separadamente.
            </p>
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Digite <span className="text-destructive font-bold">EXCLUIR</span> para confirmar
              </label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full max-w-xs rounded border border-input bg-background px-3 py-2 text-sm"
                placeholder="EXCLUIR"
              />
            </div>
            <button
              onClick={onDelete}
              disabled={loading || confirm !== "EXCLUIR"}
              className="mt-4 inline-flex items-center rounded-full bg-destructive px-5 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Excluindo…" : "Excluir minha conta permanentemente"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
