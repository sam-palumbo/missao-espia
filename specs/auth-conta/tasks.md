# Tasks — Criar Conta e Recuperar Senha

> Refs: [`requirements.md`](./requirements.md) · [`design.md`](./design.md).
> Cada task entrega implementação **+ testes**. Tamanho alvo: 1–4h.

## Grafo de dependências

```
T1 (config)         ─┐
T2 (mapa de erros)  ─┼─> T3 (useAuth) ─┬─> T4 (login na home)
                     │                  ├─> T5 (criar conta)
                     │                  ├─> T6 (recuperar)
                     │                  ├─> T7 (redefinir)
                     │                  └─> T8 (Google + callback)
                     └─────────────────────> T9 (config Supabase remoto/Google) [infra, paralelo]
T4..T8 ─> T10 (E2E smoke)
```

Ordem de execução: **T1 → T2 → T3 → (T4..T8 em paralelo) → T10**. T9 é infra e
pode correr em paralelo a partir de T1.

---

## T1 — Constantes e validação compartilhada
**Depende de:** nada
**Arquivos:** `web/src/lib/auth-validation.ts` (novo)
**Implementação:**
- `MIN_PASSWORD_LENGTH = 6` (sincronizado com `minimum_password_length`).
- `validarEmail(email): boolean`, `validarSenha(pwd): string | null`,
  `validarConfirmacao(pwd, conf): string | null` — retornam mensagem PT-BR ou null.
**Testes (Vitest):**
- PBT P4: ∀ senha `length >= MIN` → válida; ∀ `< MIN` → erro.
- E-mails válidos/ inválidos (tabela de casos).
**Aceitação:** AC1.2, AC1.3, AC1.4, P4, P5 (regras puras testáveis).

---

## T2 — Mapa de erros GoTrue → PT-BR
**Depende de:** nada
**Arquivos:** `web/src/lib/auth-errors.ts` (novo)
**Implementação:**
- `traduzErroAuth(error): string` cobrindo a tabela do design §4.2 (incl. fallback
  de rede/desconhecido).
**Testes (Vitest):**
- Cada entrada da tabela mapeia para a string esperada; desconhecido → fallback.
**Aceitação:** AC0.1, AC1.5, AC3.2, AC3.3, AC7.4.

---

## T3 — Estender `useAuth`
**Depende de:** T1, T2
**Arquivos:** `web/src/hooks/useAuth.ts`
**Implementação:** adicionar `criarConta`, `entrar`, `recuperarSenha`,
`redefinirSenha`, `reenviarConfirmacao`, `entrarComGoogle`, `sair` conforme design
§4.1. Cada uma retorna `{ error?: string }` (usando `traduzErroAuth`). `criarConta`
e `entrarComGoogle` ramificam por `isAnonymous` (updateUser/linkIdentity vs
signUp/signInWithOAuth). `redirectTo` aponta para rotas corretas.
**Testes (Vitest, `supabase.auth` mockado):**
- `criarConta`: anônimo→`updateUser`; não-anônimo→`signUp` (AC1.1 + borda).
- `entrar` sucesso/falha (AC3.1/3.2).
- `recuperarSenha`: `redirectTo` correto; **PBT P3** mesma mensagem p/ existente e
  inexistente (AC4.2).
- `entrarComGoogle`: anônimo→`linkIdentity`; senão→`signInWithOAuth` (AC7.1/7.2).
- **PBT P1**: `user.id` preservado em conversão simulada.
**Aceitação:** AC1.1, AC1.6, AC3.1, AC4.1, AC7.1, AC7.2, AC6.1, P1, P3.

---

## T4 — Login na home + corrigir links
**Depende de:** T3
**Arquivos:** `web/src/app/page.tsx`
**Implementação:** ligar campos/botões existentes: "Entrar" → `entrar`; "Esqueci a
senha" → `/conta/recuperar`; "Crie sua conta" → **`/conta/criar`** (corrige
AC0.3); botão "Entrar com Google" → `entrarComGoogle`. Loading + toasts.
**Testes (RTL):**
- Botão desabilitado sem campos / durante loading (AC3.4).
- Credenciais inválidas → toast genérico (AC3.2).
- "Crie sua conta" navega para `/conta/criar` (AC0.3).
**Aceitação:** AC0.2, AC0.3, AC3.1–3.4.

---

## T5 — Página criar conta
**Depende de:** T3
**Arquivos:** `web/src/app/conta/criar/page.tsx` (novo)
**Implementação:** form e-mail + senha + confirmar senha (mostrar/ocultar) +
botão Google. Usa validação T1 antes de chamar `criarConta`. Sucesso → toast
"enviamos um e-mail de confirmação" (AC1.6). Estilo `design.tsx`.
**Testes (RTL):**
- Validação bloqueia envio (e-mail inválido, senha curta, senhas diferentes).
- Loading desabilita botão (AC1.7).
- Sucesso mockado → toast de confirmação.
- E-mail duplicado mockado → "E-mail já cadastrado".
**Aceitação:** AC1.1–1.7, AC0.2.

---

## T6 — Página recuperar senha
**Depende de:** T3
**Arquivos:** `web/src/app/conta/recuperar/page.tsx` (novo)
**Implementação:** campo e-mail → `recuperarSenha`. Sempre toast neutro (AC4.2).
Link de volta ao login.
**Testes (RTL):**
- Envio → toast neutro idêntico independentemente do retorno mockado (P3/AC4.2).
- Loading desabilita botão (AC4.3).
**Aceitação:** AC4.1–4.3, P3.

---

## T7 — Página redefinir senha
**Depende de:** T3
**Arquivos:** `web/src/app/conta/redefinir/page.tsx` (novo)
**Implementação:** escuta `onAuthStateChange("PASSWORD_RECOVERY")`; só mostra o
form com sessão de recuperação (AC5.1). Nova senha + confirmar → `redefinirSenha`
→ redirect. Sem sessão de recuperação → aviso + link p/ `/conta/recuperar` (AC5.4).
**Testes (RTL):**
- Sem evento de recovery → form oculto / aviso (AC5.1, AC5.4).
- Após evento → form visível; senha inválida bloqueia (AC5.3).
- Sucesso mockado → redirect/toast (AC5.2, AC5.5).
**Aceitação:** AC5.1–5.5.

---

## T8 — Google OAuth + callback
**Depende de:** T3
**Arquivos:** `web/src/app/auth/callback/page.tsx` (novo); ajustes em T4/T5 já
ligam o botão.
**Implementação:** página callback aguarda `getSession`/`onAuthStateChange` e
redireciona p/ "/" (sucesso) ou home com erro (AC7.3, AC7.5). Tratar
`Identity already linked` (AC7.4) via toast (mapa T2).
**Testes (RTL):**
- Callback com sessão → redirect "/".
- Erro/cancelamento → volta sem crash (AC7.5).
**Aceitação:** AC7.3, AC7.4, AC7.5.

---

## T9 — Configuração Supabase (infra)
**Depende de:** T1 (paralelo ao resto)
**Arquivos:** `supabase/config.toml` + painel remoto/Google Cloud
**Implementação:** aplicar tabela do design §5 (`enable_anonymous_sign_ins`,
`enable_manual_linking`, `enable_confirmations`, `site_url`/redirects,
`[auth.external.google]`). Alinhar projeto remoto. **Sem SMTP** (D4).
**Verificação:**
- `supabase start` local com confirmations on; criar conta envia e-mail (Inbucket).
- Google OAuth completa em staging.
**Aceitação:** AC2.1, riscos #1, #2, #4, #5.

---

## T10 — E2E smoke (Playwright)
**Depende de:** T4–T8
**Arquivos:** `web/e2e/auth.spec.ts` (ou padrão existente)
**Implementação:** criar conta → tela "confirme e-mail"; recuperar → tela neutra;
link "Crie sua conta" leva a `/conta/criar`.
**Aceitação:** validação ponta-a-ponta dos caminhos felizes (sem serviços externos).

---

## Definition of Done (por task)
- [ ] Implementação completa
- [ ] Testes escritos e passando (unit + componente; PBT onde indicado)
- [ ] Casos de borda cobertos
- [ ] Mensagens em PT-BR e estilo visual consistente
- [ ] `npm run lint` e suíte Vitest verdes
- [ ] Revisão de código
