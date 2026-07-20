# Security Audit Report — PrecinhoBom

Data: 2026-07-20 · Skill: Vibe Security Check

## Executive Summary

Base já estava sólida (auditorias RLS anteriores + linter Supabase limpo). Esta rodada encontrou **1 High** (open-redirect no endpoint público de tracking) e **1 Medium** (validação de URL fraca no upload de catálogo), ambos corrigidos automaticamente. Dependências sem CVEs High/Critical.

## Reconnaissance

| Módulo | Status | Motivo |
|---|---|---|
| SEC-01 Segredos hardcoded | ✅ Rodado | `.env` com chaves publishable/anon (públicas por design); nenhum service_role ou secret exposto no bundle |
| SEC-02 Autenticação | ✅ Rodado | Supabase Auth gerenciado (hash/sessão/refresh cuidados pelo provider) |
| SEC-03 JWT | ✅ Rodado | `getClaims()` valida assinatura no middleware; sem HS256 caseiro |
| SEC-04 Password reset | ⏭️ N/A | Fluxo gerenciado pelo Supabase Auth |
| SEC-05 IDOR / ownership | ✅ Rodado | RLS em todas as tabelas + checagens `owner_user_id = auth.uid()` |
| SEC-06 Admin routes | ✅ Rodado | Layout `_authenticated` + `beforeLoad` com `has_role('admin')` |
| SEC-07 Input validation | ✅ Rodado | Todos `createServerFn` usam `zod.parse` em `.inputValidator()` |
| SEC-08 XSS | ✅ Rodado | Nenhum `dangerouslySetInnerHTML`, `innerHTML` ou `eval` no `src/` |
| SEC-09 File uploads | ⏭️ N/A | Sem storage buckets / uploads de arquivo (apenas CSV parseado in-memory) |
| SEC-10 CORS | ⏭️ N/A | Server functions same-origin; endpoint público retorna redirect/plain text |
| SEC-11 Webhook HMAC | ⏭️ N/A | Sem webhooks recebidos no momento |
| SEC-12 Erros vazando | ✅ Rodado | `src/lib/errors.ts` traduz erros; `errorComponent` no root |
| SEC-13 Rate limiting | ⚠️ Manual | Não implementado — Supabase Auth já limita login/signup; `/api/public/track` sem limite (ver Manual) |
| Dependency scan | ✅ Rodado | 0 CVE High/Critical |

## Findings

### 🟠 High — Open redirect em `/api/public/track` — CORRIGIDO
`Response.redirect(offer.url, 302)` usava a URL vinda do banco sem validar o esquema. Um `javascript:` ou `data:` gravado em `offers.url` (via merchant comprometido ou bypass de validação no upload — ver Medium abaixo) transformava o domínio em vetor de phishing/XSS-via-redirect.
**Fix**: valida `new URL(...)` e exige `protocol in {http, https}` antes do redirect.

### 🟡 Medium — Validação de URL fraca no upload de catálogo — CORRIGIDO
`z.string().url()` (Zod) aceita `javascript:...` e `data:...` como "URL válida". Combinado com o item acima, permitia gravar payloads maliciosos em `offers.url` / `products.image_url`.
**Fix**: novo schema `httpUrl` restringe a `http://` / `https://` em `catalogRow.url` e `.image`.

### 🟢 Low — Sem rate limiting no `/api/public/track` — MANUAL
Endpoint público insere um clique por request. Pode ser abusado para inflar métricas ou stress. Impacto real baixo (INSERT barato, sem PII).

## Auto-fixed

- `src/routes/api/public/track.tsx` — validação de esquema do redirect
- `src/lib/products.functions.ts` — schema `httpUrl` bloqueando `javascript:`/`data:` no catálogo

## Manual attention

1. **Rate limit no `/api/public/track`** — usar Cloudflare Rate Limiting no domínio publicado (`project--{id}.lovable.app`) ou introduzir um contador em tabela com janela deslizante.
2. **Sanitizar URLs de ofertas já persistidas** — rodar SQL de auditoria para detectar linhas legadas com esquema não-http(s):
   ```sql
   SELECT id, url FROM offers WHERE url !~* '^https?://';
   ```
3. **HIBP / leaked password protection** — habilitar em Cloud → Users → Auth Settings caso ainda não esteja ativo.

## Dependency Scan

`code--dependency_scan`: **0** vulnerabilidades High/Critical.
