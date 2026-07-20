import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — PrecinhoBom" },
      { name: "description", content: "Regras de uso da plataforma PrecinhoBom, direitos e deveres de usuários e lojistas." },
      { property: "og:title", content: "Termos de Uso — PrecinhoBom" },
      { property: "og:description", content: "Regras de uso da plataforma PrecinhoBom, direitos e deveres de usuários e lojistas." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 prose prose-neutral dark:prose-invert">
      <h1 className="font-serif text-4xl font-semibold text-foreground">Termos de Uso</h1>
      <p className="text-sm text-muted-foreground">Última atualização: 20 de julho de 2026</p>

      <h2>1. Aceitação</h2>
      <p>
        Ao acessar o PrecinhoBom você concorda com estes Termos e com a{" "}
        <a href="/privacidade">Política de Privacidade</a>. Se não concordar, não utilize a plataforma.
      </p>

      <h2>2. O serviço</h2>
      <p>
        O PrecinhoBom é um comparador de preços independente. Não vendemos produtos. As compras são
        realizadas diretamente nas lojas parceiras, sob as condições que cada uma pratica.
      </p>

      <h2>3. Cadastro e conta</h2>
      <ul>
        <li>Você deve ter pelo menos 18 anos ou autorização dos responsáveis.</li>
        <li>Informações verdadeiras e atualizadas são de sua responsabilidade.</li>
        <li>A conta é pessoal e intransferível.</li>
      </ul>

      <h2>4. Lojistas</h2>
      <p>
        Lojistas assinantes podem cadastrar produtos, ofertas e customizar sua vitrine, respeitando
        os limites do plano contratado. É vedado publicar produtos ilegais, falsificados, com preços
        falsos ou que induzam o consumidor a erro. Descumprimento leva à suspensão sem reembolso.
      </p>

      <h2>5. Conduta do usuário</h2>
      <p>É proibido:</p>
      <ul>
        <li>Utilizar robôs ou scraping automatizado sem autorização escrita;</li>
        <li>Tentar burlar mecanismos de segurança ou RLS;</li>
        <li>Publicar denúncias falsas ou avaliações manipuladas;</li>
        <li>Reproduzir conteúdo da plataforma para fins comerciais sem licença.</li>
      </ul>

      <h2>6. Preços e ofertas</h2>
      <p>
        Os preços exibidos são coletados diariamente e podem estar defasados. A responsabilidade
        pelo preço final, disponibilidade e condições de entrega é da loja parceira. Podemos receber
        comissão de afiliação em algumas compras, sem qualquer influência no posicionamento.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        A marca PrecinhoBom, o design da plataforma e o software são de titularidade exclusiva do
        PrecinhoBom. Conteúdo enviado por lojistas permanece de propriedade destes, que concedem
        licença não exclusiva de exibição na plataforma.
      </p>

      <h2>8. Assinaturas de lojistas</h2>
      <p>
        Planos são cobrados mensalmente. Cancelamento pode ser feito a qualquer momento e passa a
        valer no fim do ciclo pago. Não há reembolso proporcional, salvo determinação do CDC.
      </p>

      <h2>9. Limitação de responsabilidade</h2>
      <p>
        O PrecinhoBom não se responsabiliza por: (i) atos ou omissões das lojas parceiras;
        (ii) indisponibilidade temporária do serviço; (iii) prejuízos indiretos ou lucros cessantes.
        Nossa responsabilidade total fica limitada, quando aplicável, ao valor pago à plataforma nos
        últimos 12 meses.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas com 15 dias de
        antecedência. O uso continuado após o prazo implica aceitação.
      </p>

      <h2>11. Lei aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca do
        consumidor para dirimir eventuais controvérsias.
      </p>
    </article>
  );
}
