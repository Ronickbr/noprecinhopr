# PrecinhoBom — Comparador de Preços (MVP escalável)

Evolução moderna do BoaDica: agregador de ofertas com foco em performance, SEO, e arquitetura pronta para escalar (milhares de lojas, milhões de SKUs). Primeira versão com **catálogo seed realista** para validar UX; feeds reais de lojistas plugam depois no mesmo schema.

## Stack e infraestrutura
- **TanStack Start** (SSR + rotas file-based) para SEO nativo em página de produto.
- **Lovable Cloud** (Postgres + Auth + Storage) — login e-mail/senha + Google.
- Server functions (`createServerFn`) para leituras/escritas; `/api/public/*` para tracking de cliques.
- TanStack Query com `ensureQueryData` + `useSuspenseQuery`.

## Modelo de dados (chave para escalar)

```text
stores            id, slug, name, logo_url, trust_score, owner_user_id, status
categories        id, slug, name, parent_id
products          id, slug, name, brand, category_id, image_url, description, created_at
offers            id, product_id, store_id, price_cents, url, in_stock, updated_at
price_history     id, offer_id, price_cents, captured_at        -- particionável por mês
clicks            id, offer_id, user_id?, ua, referer, created_at  -- /api/public/track
favorites         user_id, product_id
price_alerts      id, user_id, product_id, target_price_cents, active
user_roles        user_id, role enum('admin','merchant','user')  -- tabela separada
profiles          id (fk auth.users), display_name, avatar_url
```

Índices em `offers(product_id, price_cents)`, `products(category_id)`, `products` full-text (`tsvector` em `name+brand`).
RLS: público lê `products/offers/stores/categories/price_history`; lojista escreve apenas suas próprias `offers`; admin gerencia tudo via `has_role()`.

## Escopo entregue

### 1. Público (SEO-first, SSR)
- `/` — home editorial: destaques curados, categorias populares, "melhores quedas de preço da semana".
- `/busca?q=` — busca full-text com filtros (preço, loja, categoria, avaliação da loja).
- `/categoria/$slug` — lista com filtros e ordenação.
- `/produto/$slug` — hero do produto, **tabela de ofertas ordenada por preço**, gráfico de histórico (Recharts), CTA "Avisar quando baixar", botão favoritar. Cada linha da tabela usa `/api/public/track?offer=...` antes de redirecionar para a loja.
- `head()` por rota com `og:image` do produto (dinâmico via loader).
- `sitemap.xml` server route + `robots.txt`.

### 2. Usuário (autenticado, `_authenticated/`)
- `/minha-conta/favoritos`
- `/minha-conta/alertas` — CRUD de alertas com preço-alvo.
- Sessão via Supabase; login com Google via `lovable.auth.signInWithOAuth`.

### 3. Lojista (`_authenticated/lojista/`, role `merchant`)
- Cadastro/edição da loja.
- Upload de catálogo (CSV: `sku,name,brand,category,price,url,image`) — parser server-side com validação Zod, cria/atualiza `products` + `offers` em lote.
- Dashboard de cliques por produto (últimos 30d).

### 4. Admin (`_authenticated/admin/`, role `admin`)
- Aprovação de lojas, moderação de produtos.

## Direção visual (Wirecutter/editorial)
- **Off-white** (`oklch(0.98 0.005 90)`) + tipografia serifada nos títulos (Fraunces) + sans nos corpos (Inter).
- Accent verde-oliva escuro para CTAs; badges de "Melhor preço" e "Preço mais baixo em 90 dias".
- Cards grandes com muito respiro; fotos de produto centralizadas em fundo neutro.
- Tokens semânticos em `src/styles.css` (nada de cor hardcoded).

## Performance
- SSR + streaming; imagens `loading="lazy"` exceto LCP.
- Índices SQL + limit/pagination server-side em todas as listagens (nunca `SELECT *` sem paginar).
- Cache de `stores` e `categories` no server (raro muda).
- `price_history` só grava quando preço muda (dedupe).

## Fora do escopo agora (roadmap)
- Feeds XML/JSON automáticos (só CSV manual no MVP).
- Cupons, cashback, review de usuários, comparador lado-a-lado.
- Job agendado para disparar e-mail de alerta — struct pronta, disparo real fica para quando integrar Lovable Email.

## Ordem de execução
1. Ativar Lovable Cloud → criar tabelas + RLS + roles + seed (10 lojas, 8 categorias, ~60 produtos, ~200 ofertas, histórico de 90d).
2. Design system (tokens, fontes).
3. Layout raiz (header com busca + login) e home.
4. Busca + categoria + página de produto com gráfico.
5. Auth (e-mail + Google) + favoritos + alertas.
6. Painel de lojista (CSV upload + dashboard cliques).
7. Painel admin.
8. sitemap/robots + SEO check final.

Ao aprovar, começo pelo passo 1.