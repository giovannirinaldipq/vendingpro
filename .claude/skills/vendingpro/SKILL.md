---
name: vendingpro
description: Use when working on the VendingPro SaaS project (Next.js 16 + Supabase + TypeScript). Carrega stack, convenções multi-tenant, padrões de API/page, prioridades por sprint e regras de desenvolvimento autônomo. INVOKE automaticamente sempre que a CWD for `C:/Users/USER/Documents/GitHub/vendingpro` ou quando o usuário falar de VendingPro.
---

# VendingPro — Skill de desenvolvimento

SaaS B2B de gestão para operadores de vending machines. Backoffice (`/admin/*`) + App cliente (`/app/*`) + futuro App mobile reabastecedor. Multi-tenant. Em produção em `vendingpro.vercel.app`.

## Stack canônica (não substituir sem necessidade real)

- Next.js **16.2.6** App Router + React 19.2.4 + TypeScript 5
- Tailwind v4 + shadcn/ui (base-ui)
- Supabase: SSR (`@supabase/ssr`), Auth, Postgres, Storage
- Validação: Zod + react-hook-form
- Gráficos: Recharts + componente custom Heatmap
- Email: **Resend** (sempre que precisar enviar email)
- Pagamentos: **Asaas** (boleto + PIX + CC; webhook em `/api/webhooks/asaas`)
- PDF: **@react-pdf/renderer**
- Storage de arquivos: **Supabase Storage** (bucket `photos` para fotos, `invoices` para PDFs)
- Mapas: **Leaflet** + OpenStreetMap (sem chave)
- Notificações WA: **Twilio WhatsApp Business** (deferido para S6)

## Convenção de Next 16

O repo tem `AGENTS.md` no root avisando: *"This is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing"*. Antes de usar APIs do Next que pareçam novas ou que você não tem certeza (cache, server actions, middleware, params), **ler a doc local primeiro**. Não chutar baseado em training data.

## Padrão de API (multi-tenant)

Toda rota em `/api/app/*` DEVE usar o pattern abaixo. Toda query DEVE filtrar por `tenant_id`.

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single();
  return data?.tenant_id ?? null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);
  if (!tenantId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('TABLE').select('*').eq('tenant_id', tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
```

Rotas `/api/admin/*` só checam se o usuário existe em `admin.users` e tem role suficiente.

## Padrão de migration

Não editar `supabase/schema.sql` para mudanças novas. Criar arquivo em `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql`. Toda nova tabela deve incluir `tenant_id UUID REFERENCES public.tenants(id) NOT NULL` (se for dado de cliente), RLS habilitado, e policy `tenant_isolation`.

## Padrão de página CRUD

`/app/<recurso>/page.tsx` (lista), `/app/<recurso>/novo/page.tsx` (criar), `/app/<recurso>/[id]/page.tsx` (detalhes), `/app/<recurso>/[id]/editar/page.tsx` (editar). Lista usa `<Table>` do shadcn, form usa react-hook-form + zodResolver. Toast via `sonner`.

## Variáveis de ambiente (manter `.env.example` sempre atualizado)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
NEXT_PUBLIC_CRON_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
ASAAS_API_KEY=
ASAAS_ENV=sandbox|production
ASAAS_WEBHOOK_TOKEN=
```

## Sprints (ordem inegociável)

1. **S1 Fundação Comercial** — Resend, Asaas, PDF, reset senha, status middleware, admin users, audit
2. **S2 Motor de Alertas** — engine automática + cron
3. **S3 Reabastecedor** — CRUD, GPS, fotos, reposição
4. **S4 Financeiro** — costs, CMV, resultado, alerta prejuízo
5. **S5 Sugestões/Previsão** — abastecimento, estoque, compra
6. **S6 Polimento** — mapa, fotos máquinas/locais, WhatsApp, 2FA, histórico
7. **S7 Contratos + Conciliação**
8. **S8 Relatórios + Onboarding**
9. **S9+ PWA + IA**

Cada sprint roda em branch `feat/sX-<escopo>` → merge na `main` após verificação. Commits seguem padrão `feat:`/`fix:`/`chore:`/`refactor:` que já vinha sendo usado.

## Regras de desenvolvimento autônomo (Giovanni autorizou)

- **Não pedir autorização** para implementar dentro do escopo do sprint corrente.
- **Decisões já tomadas** (Asaas, Resend, etc) não devem ser reabertas a cada passo.
- **Confirmar APENAS** se houver decisão de produto que muda escopo do sprint, custo financeiro recorrente novo, ou ação destrutiva em dados de produção.
- Criar a branch antes de codar. Commits frequentes e pequenos. PR/merge ao fim do sprint.
- Após cada sprint, atualizar a nota correspondente em `C:/Users/USER/Documents/vault-cerebro/01 - Projetos/` (data + status real, sem otimismo).
- Verificar com `npm run build` antes de cada commit grande. UI/feature → rodar `npm run dev` e testar antes de afirmar que está pronto.

## Anti-padrões observados nas notas

- Marcar item como "✅" sem ter código executando. **Status real > status na nota.**
- Tratar "alertas" como prontos quando só existe CRUD (sem motor automático).
- Misturar Health Score e Rankings (a nota documenta separados, código uniu — manter unido OK, mas atualizar a nota).
