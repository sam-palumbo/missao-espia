# Design — Criar Conta e Recuperar Senha

> Requisitos: ver [`requirements.md`](./requirements.md). Decisões D1 (converter
> sessão anônima), D2 (confirmar e-mail), D3 (e-mail/senha + Google), D4 (sender
> padrão do Supabase).

## 1. Visão Geral da Arquitetura

A autenticação é **inteiramente client-side**, consistente com o que já existe:
`web/src/lib/supabase.ts` expõe `createClient()` (`createBrowserClient` do
`@supabase/ssr`), e `web/src/hooks/useAuth.ts` gerencia sessão via
`onAuthStateChange`. **Não há cliente server-side hoje** e este design não o
introduz — todas as operações de auth usam o browser client, que com
`@supabase/ssr` persiste a sessão em cookies e trata PKCE/`detectSessionInUrl`
automaticamente.

Stack relevante: Next.js 16 (App Router), React 19, `@supabase/ssr` ^0.10,
`@supabase/supabase-js` ^2.106, toasts via `sonner`.

```
┌─────────────────────────────────────────────────────────────┐
│  UI (rotas /conta/*)                                          │
│   ┌──────────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────┐  │
│   │ login    │ │ criar    │ │ recuperar   │ │ redefinir   │  │
│   │ (home)   │ │ conta    │ │ senha       │ │ senha       │  │
│   └────┬─────┘ └────┬─────┘ └─────┬───────┘ └─────┬───────┘  │
│        └────────────┴───── useAuth (hook) ────────┘          │
└──────────────────────────────┼──────────────────────────────┘
                                │ supabase.auth.*
                ┌───────────────▼────────────────┐
                │  Supabase Auth (GoTrue)         │
                │  signUp / updateUser /          │
                │  signInWithPassword /           │
                │  resetPasswordForEmail /        │
                │  signInWithOAuth / linkIdentity │
                └─────────────────────────────────┘
```

## 2. Mapa de APIs do Supabase Auth por fluxo

| Fluxo | Sessão atual | Chamada | Observação |
|-------|--------------|---------|------------|
| Criar conta (US1) | anônima | `updateUser({ email, password })` | Preserva `user.id` (P1). Com confirmações on, envia e-mail e só consolida o e-mail após o clique. |
| Criar conta (US1) | **sem** sessão anônima | `signUp({ email, password })` | Fallback (caso de borda). Cria `user.id` novo. |
| Confirmar e-mail (US2) | — | link do e-mail → `detectSessionInUrl` | Página de callback estabelece a sessão. |
| Login (US3) | qualquer | `signInWithPassword({ email, password })` | Erro genérico em falha (P3). |
| Reenviar confirmação | — | `resend({ type: "signup", email })` | Respeita `max_frequency`. |
| Recuperar (US4) | — | `resetPasswordForEmail(email, { redirectTo })` | Mensagem neutra sempre (P3). |
| Redefinir (US5) | recovery | `updateUser({ password })` | Disparado após evento `PASSWORD_RECOVERY`. |
| Google (US7) | anônima | `linkIdentity({ provider: "google" })` | Preserva `user.id`. Requer `enable_manual_linking = true`. |
| Google (US7) | **sem** anônima | `signInWithOAuth({ provider: "google", options: { redirectTo } })` | Login/criação direta. |
| Logout (US6) | autenticada | `signOut()` | |

> **Detecção de "tem sessão anônima":** `user?.is_anonymous === true` (já exposto
> por `useAuth` como `isAnonymous`).

## 3. Rotas e Telas

| Rota | Tipo | Função |
|------|------|--------|
| `/` (home, existente) | client page | Login e-mail/senha + botão Google + links. Liga os campos/botões já existentes (hoje inertes). |
| `/conta/criar` | client page | Formulário criar conta (e-mail, senha, confirmar senha) + Google. |
| `/conta/recuperar` | client page | Solicitar link de redefinição (campo e-mail). |
| `/conta/redefinir` | client page | Definir nova senha (após link de recuperação). |
| `/auth/callback` | client page | Estabelece sessão pós-OAuth/confirmação e redireciona. |

**Correção AC0.3:** o link "Crie sua conta" da home (`page.tsx:162`, hoje aponta
para `/criar` = criar **sala**) passa a apontar para `/conta/criar`.

> **Por que página client em `/auth/callback`, não route handler:** o app usa
> apenas browser client. Com `detectSessionInUrl: true` (padrão), o browser
> client troca o código/hash por sessão ao montar. A página apenas aguarda
> `onAuthStateChange`/`getSession` e redireciona. Se no futuro for preciso SSR de
> sessão, introduzir `createServerClient` + `route.ts` com
> `exchangeCodeForSession` (fora do escopo).

### Diagramas de fluxo

**Criar conta (visitante anônimo):**
```
[home/criar] --updateUser(email,pwd)--> Supabase
   └─ ok ─> toast "Confirme seu e-mail" ─> aguarda confirmação
[e-mail] --clique no link--> /auth/callback --getSession--> "/"  (autenticado)
```

**Recuperar → redefinir:**
```
[/conta/recuperar] --resetPasswordForEmail(redirectTo=/conta/redefinir)--> sempre toast neutro
[e-mail] --clique--> /conta/redefinir
   └─ onAuthStateChange("PASSWORD_RECOVERY") ─> mostra form
   └─ updateUser({password}) ─> toast ok ─> redirect "/"
```

## 4. Camada de código

### 4.1 `useAuth` (estender, `web/src/hooks/useAuth.ts`)

Adicionar funções, mantendo a inicialização anônima atual:

```ts
async function criarConta(email, password)   // is_anonymous ? updateUser : signUp
async function entrar(email, password)        // signInWithPassword
async function recuperarSenha(email)          // resetPasswordForEmail(redirectTo)
async function redefinirSenha(password)        // updateUser({ password })
async function reenviarConfirmacao(email)      // resend
async function entrarComGoogle()               // is_anonymous ? linkIdentity : signInWithOAuth
async function sair()                           // signOut
```

Cada função retorna `{ error?: string }` com mensagens **já traduzidas** (mapa
PT-BR), centralizando a tradução de erros do GoTrue (AC0.1). As páginas só
exibem `toast`.

### 4.2 Mapa de erros (PT-BR)

| GoTrue (en) | Mensagem exibida |
|-------------|------------------|
| `User already registered` / `email_exists` | "E-mail já cadastrado" (AC1.5) |
| `Invalid login credentials` | "E-mail ou senha inválidos" (AC3.2) |
| `Email not confirmed` | "Confirme seu e-mail para entrar" + ação reenviar (AC3.3) |
| `Password should be at least N` | "A senha deve ter ao menos N caracteres" (AC1.3) |
| `Identity is already linked` | "Esta conta Google já está vinculada a outro usuário" (AC7.4) |
| rede / desconhecido | "Falha de conexão. Tente novamente." |

### 4.3 Validação no cliente (espelhada no servidor — P5)

- E-mail: regex de formato simples + `type="email"`.
- Senha: `length >= minimum_password_length` (constante; manter sincronizada com
  config, atualmente 6).
- Confirmar senha: igualdade exata.

### 4.4 Componentes UI

Reutilizar `Input`, `PrimaryBtn`, `OutlineBtn`, `ParchmentBg`, `InsetFrame`,
`Eyebrow`, `T`, `F` de `web/src/components/ui/design.tsx` — **manter o estilo
visual existente** (pergaminho/sienna). Botão Google: `OutlineBtn` com ícone.

## 5. Configuração Supabase (`supabase/config.toml`)

| Chave | De | Para | Motivo |
|-------|----|----|--------|
| `[auth] enable_anonymous_sign_ins` | false | **true** | App usa `signInAnonymously` (risco #1) |
| `[auth] enable_manual_linking` | false | **true** | D1/US7 exigem `linkIdentity` (risco #1) |
| `[auth.email] enable_confirmations` | false | **true** | D2 (risco #2) |
| `[auth] site_url` / `additional_redirect_urls` | localhost | + domínio Vercel | Redirects de confirmação/reset/OAuth (risco #4) |
| `[auth.external.google]` | ausente | habilitar + Client ID/Secret | US7 (risco #5) |

Sem bloco `[auth.email.smtp]` (D4 — sender padrão). **Verificar que o projeto
remoto reflete essas flags** (config local ≠ remoto é o risco #1).

## 6. Estratégia de Testes

Ferramentas existentes: **Vitest + React Testing Library** (jsdom), Playwright
(E2E). Cobertura alvo ≥ 80% nos módulos novos.

### 6.1 Unitários (Vitest) — `useAuth` com `supabase.auth.*` mockado
- `criarConta`: anônimo → chama `updateUser`; não-anônimo → `signUp` (AC1.1, borda).
- Erros mapeados para PT-BR (cada linha do §4.2).
- `entrar`: sucesso/credenciais inválidas (AC3.1/3.2).
- `recuperarSenha`: chama `resetPasswordForEmail` com `redirectTo` correto.
- `entrarComGoogle`: anônimo → `linkIdentity`; senão → `signInWithOAuth` (AC7.1/7.2).

### 6.2 Componentes (RTL) — por página
- Validação bloqueia envio (e-mail inválido, senha curta, senhas diferentes).
- Estado de loading desabilita botão (AC*.7).
- Toast de sucesso/erro disparado conforme retorno mockado de `useAuth`.
- `/conta/redefinir` só mostra form após evento `PASSWORD_RECOVERY` (AC5.1).

### 6.3 Property-based (invariantes — §5 requirements)
> Loop-based sobre entradas geradas (sem adicionar `fast-check`).
- **P1:** ∀ conversão simulada bem-sucedida, `user.id` antes == depois (mock
  `updateUser` preserva id).
- **P3 (não-enumeração):** `recuperarSenha` produz **a mesma** mensagem para
  e-mail existente e inexistente (mock retornando ambos os casos).
- **P4:** ∀ senha aceita pela validação cliente, `length >= min`; ∀ senha < min é
  rejeitada antes da chamada de rede.

### 6.4 E2E (Playwright, smoke)
- Fluxo criar conta → tela "confirme seu e-mail".
- Fluxo recuperar → tela neutra.
- (Confirmação real de e-mail/OAuth Google dependem de serviços externos → fora
  do E2E automatizado; validar manualmente em staging.)

## 7. Plano de Deploy / Migração

1. Atualizar `config.toml` (§5) e dar `supabase db push`/deploy de config.
2. **Confirmar flags no projeto remoto** (anon sign-in, manual linking,
   confirmations) — alinhar com o local.
3. Configurar provedor Google no painel Supabase + Google Cloud (Client ID/Secret,
   redirect URI `<supabase-url>/auth/v1/callback`).
4. Registrar `site_url` e `additional_redirect_urls` com domínio Vercel.
5. Deploy do front (Vercel) — rotas novas são estáticas/client, sem migração de DB.
6. **Sem migração de banco**: nenhuma tabela muda; `user.id` é preservado (P1).

## 8. Checklist (pós-design)

- [x] Arquitetura cobre todos os requisitos (US1–US7)
- [x] Escolhas tecnológicas justificadas (browser client, rotas client)
- [x] Estratégia de testes com meta de cobertura
- [x] Plano de deploy/migração documentado
- [ ] Revisado pelo líder técnico ← pendente
