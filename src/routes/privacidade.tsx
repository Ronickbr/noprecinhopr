import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getLgpdContact } from "@/lib/legal.functions";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — PrecinhoBom" },
      { name: "description", content: "Como o PrecinhoBom coleta, usa e protege seus dados pessoais, em conformidade com a LGPD." },
      { property: "og:title", content: "Política de Privacidade — PrecinhoBom" },
      { property: "og:description", content: "Como o PrecinhoBom coleta, usa e protege seus dados pessoais, em conformidade com a LGPD." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData({ queryKey: ["lgpd-contact"], queryFn: () => getLgpdContact() }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { data } = useQuery({ queryKey: ["lgpd-contact"], queryFn: () => getLgpdContact() });
  const email = data?.email ?? "privacidade@precinhobom.com.br";
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 prose prose-neutral dark:prose-invert">
      <h1 className="font-serif text-4xl font-semibold text-foreground">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground">Última atualização: 20 de julho de 2026</p>

      <h2>1. Quem somos</h2>
      <p>
        O <strong>PrecinhoBom</strong> é um comparador de preços independente que centraliza ofertas
        de diversas lojas em um só lugar. Esta política descreve, em linguagem simples, quais dados
        coletamos, com quais bases legais, por quanto tempo e quais são os seus direitos como titular
        segundo a Lei nº 13.709/2018 (LGPD).
      </p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> e-mail, nome de exibição e avatar (quando você cria uma conta).</li>
        <li><strong>Uso da plataforma:</strong> favoritos, alertas de preço e histórico de clicks em ofertas.</li>
        <li><strong>Técnicos:</strong> endereço IP, tipo de dispositivo e navegador para segurança e antifraude.</li>
        <li><strong>Lojistas:</strong> dados da empresa (razão social, CNPJ, contato) quando aplicável.</li>
      </ul>

      <h2>3. Para que usamos seus dados (bases legais)</h2>
      <ul>
        <li>Execução do serviço — favoritos, alertas, histórico (art. 7º, V).</li>
        <li>Legítimo interesse — prevenção a fraude e melhoria da experiência (art. 7º, IX).</li>
        <li>Consentimento — comunicações de marketing, quando você optar (art. 7º, I).</li>
        <li>Cumprimento de obrigação legal — registros fiscais e ordens judiciais (art. 7º, II).</li>
      </ul>

      <h2>4. Compartilhamento</h2>
      <p>
        Não vendemos dados pessoais. Compartilhamos apenas com processadores essenciais ao serviço
        (infraestrutura em nuvem, autenticação, e-mail transacional) e quando exigido por autoridade
        competente.
      </p>

      <h2>5. Retenção</h2>
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão, dados são apagados em
        até 30 dias, exceto registros que devem ser preservados por obrigação legal (ex.: logs de
        segurança por até 6 meses, art. 15 do Marco Civil).
      </p>

      <h2>6. Seus direitos (LGPD)</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li>Confirmar a existência de tratamento e acessar seus dados;</li>
        <li>Corrigir dados incompletos ou desatualizados;</li>
        <li>Solicitar anonimização, bloqueio ou eliminação;</li>
        <li>Portabilidade dos dados;</li>
        <li>Revogar consentimento;</li>
        <li>Excluir sua conta diretamente em <a href="/minha-conta/privacidade">Minha conta → Privacidade</a>.</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        Utilizamos cookies estritamente necessários (sessão de autenticação) e analíticos agregados.
        Você pode desativá-los nas configurações do seu navegador — algumas funcionalidades podem
        deixar de funcionar.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Aplicamos criptografia em trânsito (TLS), controle de acesso por função (RBAC) e Row-Level
        Security no banco. Incidentes relevantes são comunicados à ANPD e aos titulares conforme
        art. 48 da LGPD.
      </p>

      <h2>9. Encarregado de Dados (DPO)</h2>
      <p>
        Para exercer seus direitos ou tirar dúvidas, entre em contato com nosso encarregado:{" "}
        <a href={`mailto:${email}`} className="text-primary">{email}</a>.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Podemos atualizar esta política. Mudanças relevantes serão comunicadas por e-mail ou aviso
        na plataforma com 15 dias de antecedência.
      </p>
    </article>
  );
}
