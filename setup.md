# Setup — Missão Espia

Guia completo para colocar o sistema no ar do zero.

---

## Pré-requisitos

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (`brew install supabase/tap/supabase`)
- Conta no [Supabase](https://supabase.com) com um projeto criado

---

## 1. Clonar e instalar dependências

```bash
git clone <repo>
cd Missao_Espia

# Dependências do web app
cd web
npm install
cd ..
```

---

## 2. Variáveis de ambiente do web app

Crie o arquivo `web/.env.local` (não é commitado):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Os valores estão em: **Supabase Dashboard → Project Settings → API**.

> `SUPABASE_SERVICE_ROLE_KEY` não precisa estar no `.env.local` — é usado apenas nas Edge Functions, onde é injetado automaticamente pelo runtime do Supabase.

---

## 3. Vincular ao projeto Supabase remoto

```bash
supabase login          # abre o browser para autenticar
supabase link --project-ref <ref>   # ex: eochshqchhcxnpadlrir
```

O `<ref>` está na URL do dashboard: `https://supabase.com/dashboard/project/<ref>`.

---

## 4. Aplicar as migrations (banco de dados)

```bash
supabase db push --linked
```

Isso executa as 4 migrations em ordem:

| Migration | O que faz |
|---|---|
| `20260521000000_schema_inicial.sql` | Cria tabelas `salas`, `jogadores`, `rodadas`, `votos` + ativa RLS |
| `20260521000001_rpc_pontuacao.sql` | Cria função `incrementar_pontuacao(jogador_id, delta)` |
| `20260521000002_rls_policies.sql` | Políticas de leitura para cada tabela |
| `20260521000003_fix_rls_recursion.sql` | Corrige recursão infinita no RLS de `jogadores` com função `get_user_sala_ids()` security definer |

---

## 5. Ativar autenticação anônima

No dashboard: **Authentication → Providers → Anonymous Sign-ins → Enable**.

Sem isso, o app não consegue criar sessões para jogadores sem conta.

---

## 6. Ativar Realtime nas tabelas

No **SQL Editor** do dashboard, execute:

```sql
alter publication supabase_realtime add table jogadores, rodadas, salas;
```

Sem esse passo, as atualizações em tempo real via WebSocket não funcionam. O app tem polling de 3s como fallback, mas o Realtime é necessário para a experiência correta.

---

## 7. Deploy da Edge Function

```bash
supabase functions deploy game --project-ref <ref>
```

A função `game` é o backend do jogo — todas as ações (criar sala, entrar, iniciar rodada, votar, etc.) passam por ela.

> O secret `SUPABASE_SERVICE_ROLE_KEY` é **injetado automaticamente** pelo runtime — não precisa ser configurado manualmente.

---

## 8. Rodar o web app localmente

```bash
cd web
npm run dev
# Acesse http://localhost:3000
```

---

## 9. Testar com bots (opcional)

O script `scripts/bots.mjs` cria jogadores automatizados para testar sem precisar de outros dispositivos.

```bash
# Primeiro, crie uma sala no app e copie o código (ex: ABCD)
node scripts/bots.mjs ABCD 3   # adiciona 3 bots à sala ABCD
```

Os bots entram na sala, passam turnos, acusam e votam automaticamente. O anfitrião ainda precisa clicar em "Iniciar Partida" manualmente (mínimo 4 jogadores = 1 humano + 3 bots).

---

## Checklist rápido

- [ ] `web/.env.local` criado com URL e anon key
- [ ] `supabase link` executado
- [ ] `supabase db push --linked` executado (4 migrations)
- [ ] Anonymous Sign-ins habilitado no dashboard
- [ ] `alter publication supabase_realtime add table ...` executado no SQL Editor
- [ ] `supabase functions deploy game` executado
- [ ] `npm run dev` rodando em `web/`

---

## Estrutura do projeto

```
Missao_Espia/
├── supabase/
│   ├── functions/game/        # Edge Function (Deno) — lógica do jogo
│   │   ├── index.ts           # Roteador de actions
│   │   ├── handlers/          # criar-sala, entrar-sala, iniciar-rodada, etc.
│   │   └── lib/               # tipos, db client, helpers
│   └── migrations/            # SQL aplicado em ordem cronológica
├── web/                       # Next.js 16 app
│   └── src/
│       ├── app/               # Páginas: /, /criar, /entrar, /sala/[code]/*
│       ├── components/        # AuthProvider, Button, Input
│       ├── hooks/             # useAuth, usePlayers, useGameState
│       └── lib/               # supabase client, game-actions, eventos
├── scripts/
│   └── bots.mjs               # Bots para testes
└── lista_eventos_locais.md    # 32 eventos bíblicos usados no jogo
```

---

## Problemas conhecidos e soluções

| Problema | Causa | Solução |
|---|---|---|
| `POST /auth/v1/signup 422` | Anonymous Sign-ins desabilitado | Habilitar no dashboard (passo 5) |
| `CORS error` na Edge Function | Função não deployada | `supabase functions deploy game` (passo 7) |
| `GET /jogadores 500` | RLS com recursão infinita | Migration 3 resolve; confirmar que `db push` foi executado |
| Jogadores não atualizam em tempo real | Tabelas fora da publicação Realtime | Executar o `alter publication` do passo 6 |
| Lobby travado em "Iniciando..." | Realtime de `salas` não funcionando | Passo 6 resolve; o polling de 3s é o fallback enquanto isso |
