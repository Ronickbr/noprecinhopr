# Reconstrução completa do Painel Admin — PrecinhoBom

Vou reconstruir o painel administrativo do zero, com arquitetura escalável, UX inspirada em Linear/Vercel/Stripe, e componentes reutilizáveis. Dado o tamanho do escopo, entrego em **fases** — cada fase gera um painel funcional e navegável, sem quebrar o resto do sistema.

## Arquitetura base (Fase 0 — fundação)

Reescrever `src/routes/_authenticated/admin.tsx` e criar primitivos que **todas** as telas vão consumir:

- **Shell novo**: sidebar recolhível (persistida em `localStorage`), topbar com busca global (⌘K), breadcrumb, alternador tema claro/escuro, avatar/menu.
- **Primitivos reutilizáveis** em `src/components/admin/`:
  - `DataTable` — paginação server-side, ordenação, seleção múltipla, ações em lote, colunas configuráveis, exportação CSV/Excel/PDF, skeleton de loading, empty state.
  - `FilterBar`, `SearchInput` (debounced), `StatCard`, `PageHeader`, `ConfirmDialog`, `SideSheet` (detalhe/edição), `EmptyState`, `Skeleton`, `Chart` wrapper (Recharts).
- **Tema claro/escuro** via `next-themes`, tokens já existentes em `src/styles.css` estendidos para ambos os modos.
- **Toasts** via `sonner` (já instalado). Confirmações destrutivas via modal.
- **Padrões de rota**: cada seção vira `admin.<secao>.tsx` (lista) + `admin.<secao>.$id.tsx` (detalhe) sob o layout novo.

## Sidebar — itens

Dashboard, Lojas, Usuários, Produtos, Categorias, Subcategorias, Marcas, Ofertas, Regiões, Solicitações, Denúncias, Relatórios, Logs, Permissões, Configurações, Financeiro *(placeholder "em breve")*.

## Fases de entrega

### Fase 1 — Fundação + Dashboard + Lojas + Produtos + Usuários *(entrego agora)*
- Shell novo, primitivos, tema claro/escuro.
- **Dashboard**: cards (lojas, produtos ativos/pendentes/expirados, usuários, cliques 30d, novos cadastros 7d, comparações, economia estimada), gráfico de crescimento (linha), gráfico de novos produtos (barras), tabelas "últimos cadastros", "produtos mais pesquisados", "lojas mais acessadas", alertas do sistema. Mapa do Paraná: heat-list por cidade (SVG do PR entra na Fase 2 — evita dependência pesada agora).
- **Lojas**: DataTable com foto, nome, cidade, plano, nº produtos, último acesso, status, data cadastro, ações. `SideSheet` de detalhe com abas (Dados, Produtos, Histórico, Acessos, Plano, Logs).
- **Produtos**: filtros laterais (categoria, marca, status, faixa de preço), busca, tabela com imagem/nome/categoria/marca/nº lojas/menor/maior/médio/atualização/status. Detalhe com gráfico de evolução, lojas que vendem, preço por cidade.
- **Usuários**: tabela com papéis, filtros por papel, gestão de permissões (grant/revoke admin/merchant/moderator).

### Fase 2 — Catálogo estendido + Moderação
- **Categorias / Subcategorias / Marcas**: CRUD com drag-and-drop de ordenação (requer migração: tabelas `subcategories`, `brands`, coluna `sort_order`).
- **Ofertas**: maior desconto, aumentos, sem atualização, destaques, validade, comparativo.
- **Regiões**: gestão de cidades/estado com contadores.
- **Solicitações**: fila de aprovação (lojas, produtos, marcas, categorias) — aceitar/rejeitar/solicitar correção (requer migração: tabela `approval_requests`).
- **Denúncias**: fila com status (requer migração: tabela `reports`).

### Fase 3 — Relatórios + Logs + Configurações + Permissões
- **Relatórios**: mais buscados, mais acessadas, categorias/marcas populares, economia média, rankings cidade/loja/produto, exportação Excel/PDF.
- **Logs**: sistema de audit-log completo (requer migração: tabela `audit_logs` + triggers em tabelas críticas). Filtros por tipo, usuário, período.
- **Permissões**: matriz papel × recurso (novo papel `moderator`).
- **Configurações**: SEO (título/descrição/OG), logo/favicon, redes sociais, GA/GTM/Meta Pixel, SMTP, WhatsApp, Termos, Privacidade, LGPD, integrações/API, backup (requer migração: tabela `site_settings` key-value).

### Fase 4 — Mapa do PR + Financeiro
- Mapa SVG interativo do Paraná no dashboard.
- Módulo financeiro (faturas, MRR, churn — se assinaturas estiverem em produção).

## Detalhes técnicos

- **Server functions** novas em `src/lib/admin.functions.ts` (separado de `products.functions.ts` que já está grande): todas com `.middleware([requireSupabaseAuth])` + checagem `has_role(uid, 'admin')`. Paginação server-side (`range`), busca com `ilike`/`websearch_to_tsquery`, ordenação parametrizada.
- **Cache**: TanStack Query com `staleTime` de 30s em listas, `invalidateQueries` após mutations.
- **Migrações necessárias na Fase 1**: nenhuma — reuso tabelas atuais (`stores`, `products`, `offers`, `clicks`, `profiles`, `user_roles`, `merchant_subscriptions`, `merchant_plans`, `categories`, `price_history`).
- **Coexistência**: rotas antigas (`admin.lojas.tsx`, `admin.produtos.tsx`, etc.) são **substituídas** pelas novas com o mesmo path — sem rota duplicada. Nada fora de `/admin/*` é tocado.
- **Bibliotecas novas** (Fase 1): `next-themes` (dark mode), `recharts` (gráficos), `@tanstack/react-table` (DataTable robusta). Instalo com `bun add` antes dos imports.

## O que fica de fora desta primeira entrega
Fases 2–4 acima. Confirmado o plano, começo pela Fase 1 e sigo em entregas subsequentes conforme você aprovar cada uma.
