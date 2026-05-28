# Deploy — Auth (conta e recuperação de senha)

Passos manuais necessários além do código. Ver design §5/§7.

## Dados do projeto

- **Project ref:** `eochshqchhcxnpadlrir`
- **Callback OAuth (registrar no Google Cloud):** `https://eochshqchhcxnpadlrir.supabase.co/auth/v1/callback`
- **Google Client ID:** `677269198186-i6vidqdh6d3m831j72thf4k8617fngfh.apps.googleusercontent.com`
- **Google Secret:** armazenado em `supabase/.env.local` (gitignored — não versionar)

## 1. Variáveis de ambiente (Supabase CLI local)

Já gravadas em `supabase/.env.local`. Antes de `supabase start`, carregue-as no shell
(o `env()` do config.toml lê do ambiente do processo):

```sh
set -a && source supabase/.env.local && set +a
supabase start
```

## 2. Projeto remoto Supabase — aplicado via `supabase config push`

Sincronizado com `config.toml` (push em 2026-05-28; "Remote Auth config is up to date"):

- [x] **Anonymous sign-ins**: habilitado (já estava on no remoto)
- [x] **Manual linking**: habilitado (necessário para `linkIdentity`)
- [x] **Confirm email**: habilitado (D2)
- [x] **Site URL**: `https://missao-espia.vercel.app` (via `AUTH_SITE_URL` no push)
- [x] **Redirect URLs**: localhost + `https://missao-espia.vercel.app/**`
- [x] **Provider Google**: habilitado com Client ID/Secret (de `supabase/.env.local`)

> ⚠️ **Lição — `config push` empurra o config.toml INTEIRO.** O primeiro push
> sobrescreveu 3 settings que o remoto tinha customizado (MFA TOTP, email
> `max_frequency`, `otp_length`); foram restaurados num segundo push. Antes de
> futuros `config push`, revisar o diff por completo.
>
> **Comando usado:**
> ```sh
> set -a && source supabase/.env.local && set +a
> AUTH_SITE_URL=https://missao-espia.vercel.app supabase config push
> ```

## 3. Google Cloud Console

- [x] Credencial **OAuth 2.0 Client ID** criada (Web application)
- [x] **Authorized redirect URI**: `https://eochshqchhcxnpadlrir.supabase.co/auth/v1/callback`
- [x] Client ID/Secret obtidos → gravados em `supabase/.env.local`
- [ ] Conferir **Authorized JavaScript origins** com o domínio do app (localhost + Vercel)

## 4. Vercel

- [ ] Deploy do front (rotas novas são client/estáticas, sem migração de DB)
- [ ] Conferir `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 5. Verificação pós-deploy

- [ ] Criar conta → recebe e-mail de confirmação → link leva a `/auth/callback` → autenticado
- [ ] Recuperar senha → e-mail → `/conta/redefinir` → nova senha → login
- [ ] Login Google (anônimo) preserva histórico (mesmo `user.id`)

> **D4:** sem SMTP dedicado — sender padrão do Supabase tem limite de taxa.
> Migrar para SMTP próprio (`[auth.email.smtp]`) quando o volume crescer.
