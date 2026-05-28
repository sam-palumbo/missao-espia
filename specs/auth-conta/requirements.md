# Requisitos — Criar Conta e Recuperar Senha

## 1. Introdução

Atualmente o Missão Espia autentica todos os jogadores de forma **anônima**
(`signInAnonymously`, ver `web/src/hooks/useAuth.ts`). O `user.id` resultante é a
chave de todo o modelo de jogo: `salas.anfitriao` e `jogadores.user_id` apontam
para ele (ver `supabase/functions/game/handlers/criar-sala.ts`).

Esta funcionalidade adiciona **contas permanentes de e-mail/senha**, permitindo
que um jogador:
- promova sua sessão anônima a uma conta com e-mail/senha (preservando histórico);
- entre novamente com essa conta a partir de qualquer dispositivo;
- recupere o acesso quando esquecer a senha.

**Escopo desta entrega:** e-mail/senha **e** login social com Google (OAuth).

### Glossário

- **Visitante / sessão anônima:** usuário autenticado via `signInAnonymously`, sem
  e-mail. Possui um `user.id` estável enquanto a sessão local persistir.
- **Conta permanente:** usuário com identidade de e-mail/senha confirmada.
- **Converter (promover) conta:** transformar a sessão anônima atual em conta
  permanente via `supabase.auth.updateUser({ email, password })`, **mantendo o
  mesmo `user.id`** — preserva salas, jogadores e placar já vinculados.
- **Confirmação de e-mail:** etapa em que o usuário clica num link enviado por
  e-mail para validar o endereço antes de poder entrar.
- **Redefinição de senha:** fluxo `resetPasswordForEmail` → link → `updateUser({ password })`.

### Decisões de produto (confirmadas com o stakeholder)

| # | Decisão | Valor | Origem |
|---|---------|-------|--------|
| D1 | Sessão anônima ao criar conta | **Converter** a sessão atual (mesmo `user.id`), preservando histórico | Stakeholder (confirmado) |
| D2 | Confirmação de e-mail | **Exigir** confirmação antes do login | Stakeholder |
| D3 | Escopo | **E-mail/senha + Google OAuth** | Stakeholder |
| D4 | Envio de e-mail | **Sender padrão do Supabase** (aceitando os limites de taxa) | Stakeholder |

> D1: como `salas.anfitriao` e `jogadores.user_id` referenciam o `user.id`, criar
> um usuário novo e separado orfanaria o histórico. A conversão via `updateUser`
> (e-mail) / `linkIdentity` (Google) mantém a integridade referencial.
>
> D4: o sender padrão do Supabase tem limite de taxa (poucos e-mails/hora) e não é
> recomendado para produção de alto volume. Aceitável para o estágio atual do
> projeto; migrar para SMTP dedicado quando o volume crescer.

---

## 2. User Stories

- **US1 — Criar conta (converter sessão anônima):** Como visitante, quero criar
  uma conta com e-mail e senha, para preservar meu histórico e acessar de
  qualquer dispositivo.

- **US2 — Confirmar e-mail:** Como novo usuário, quero confirmar meu e-mail por um
  link, para ativar minha conta de forma segura.

- **US3 — Entrar com conta existente:** Como usuário registrado, quero entrar com
  e-mail e senha, para retomar minha conta em qualquer dispositivo.

- **US4 — Solicitar recuperação de senha:** Como usuário que esqueceu a senha,
  quero pedir um link de redefinição por e-mail, para recuperar o acesso.

- **US5 — Redefinir senha:** Como usuário com link de redefinição, quero definir
  uma nova senha, para voltar a entrar.

- **US6 — Sair da conta (logout):** Como usuário registrado, quero sair da conta,
  para proteger o acesso em dispositivos compartilhados.

- **US7 — Entrar/criar conta com Google:** Como visitante, quero usar minha conta
  Google para entrar, para evitar criar e lembrar uma senha.

---

## 3. Critérios de Aceitação (EARS)

### US1 — Criar conta

- AC1.1 — WHEN o usuário envia o formulário de criação de conta com e-mail e senha
  válidos, THE sistema SHALL chamar `updateUser({ email, password })` sobre a
  sessão anônima atual, preservando o `user.id`.
- AC1.2 — IF o e-mail informado é inválido (não passa em validação de formato),
  THEN THE sistema SHALL exibir erro e NÃO SHALL enviar a requisição.
- AC1.3 — IF a senha tem menos que o comprimento mínimo configurado (ver
  `minimum_password_length`, atualmente 6), THEN THE sistema SHALL exibir erro e
  bloquear o envio.
- AC1.4 — IF a senha e a confirmação de senha diferem, THEN THE sistema SHALL
  exibir erro e bloquear o envio.
- AC1.5 — IF o e-mail já está em uso por outra conta, THEN THE sistema SHALL
  exibir mensagem clara ("E-mail já cadastrado") sem revelar dados da conta
  existente.
- AC1.6 — WHEN a criação é aceita pelo backend, THE sistema SHALL informar que um
  e-mail de confirmação foi enviado e instruir o usuário a verificá-lo.
- AC1.7 — WHILE a requisição está em andamento, THE sistema SHALL desabilitar o
  botão de envio e exibir estado de carregamento.

### US2 — Confirmar e-mail

- AC2.1 — THE sistema SHALL exigir confirmação de e-mail antes de liberar o login
  da conta (`enable_confirmations = true`).
- AC2.2 — WHEN o usuário clica no link de confirmação válido, THE sistema SHALL
  estabelecer a sessão e redirecioná-lo para a tela inicial autenticada.
- AC2.3 — IF o link de confirmação é inválido ou expirado, THEN THE sistema SHALL
  exibir mensagem de erro e oferecer reenvio do e-mail.

### US3 — Entrar com conta

- AC3.1 — WHEN o usuário envia e-mail e senha corretos de uma conta confirmada,
  THE sistema SHALL autenticá-lo via `signInWithPassword` e redirecioná-lo à tela
  inicial autenticada.
- AC3.2 — IF as credenciais estão incorretas, THEN THE sistema SHALL exibir
  mensagem genérica ("E-mail ou senha inválidos") sem distinguir qual campo
  falhou.
- AC3.3 — IF a conta existe mas o e-mail ainda não foi confirmado, THEN THE
  sistema SHALL informar que a confirmação está pendente e oferecer reenvio.
- AC3.4 — WHILE a requisição está em andamento, THE sistema SHALL desabilitar o
  botão e exibir carregamento.

### US4 — Solicitar recuperação

- AC4.1 — WHEN o usuário envia um e-mail no fluxo "Esqueci a senha", THE sistema
  SHALL chamar `resetPasswordForEmail` com `redirectTo` apontando para a rota de
  redefinição.
- AC4.2 — THE sistema SHALL exibir sempre a mesma mensagem de sucesso ("Se houver
  uma conta com este e-mail, enviamos um link"), independentemente de o e-mail
  existir, para não revelar quais e-mails estão cadastrados.
- AC4.3 — WHILE a requisição está em andamento, THE sistema SHALL desabilitar o
  botão e exibir carregamento.

### US5 — Redefinir senha

- AC5.1 — WHEN o usuário acessa a rota de redefinição com uma sessão de
  recuperação válida, THE sistema SHALL exibir o formulário de nova senha.
- AC5.2 — WHEN o usuário envia uma nova senha válida, THE sistema SHALL chamar
  `updateUser({ password })` e confirmar o sucesso.
- AC5.3 — IF a nova senha não atende ao comprimento mínimo ou não confere com a
  confirmação, THEN THE sistema SHALL exibir erro e bloquear o envio.
- AC5.4 — IF o link de redefinição é inválido ou expirado, THEN THE sistema SHALL
  exibir erro e oferecer reiniciar o fluxo de recuperação.
- AC5.5 — WHEN a senha é redefinida com sucesso, THE sistema SHALL redirecionar
  para a tela de login (ou tela inicial autenticada).

### US6 — Logout

- AC6.1 — WHEN o usuário aciona "Sair", THE sistema SHALL chamar `signOut` e
  retornar à tela inicial.

### US7 — Google OAuth

- AC7.1 — WHEN o usuário (anônimo) aciona "Entrar com Google", THE sistema SHALL
  chamar `linkIdentity({ provider: "google" })` para **preservar o `user.id`** e
  o histórico (mesma lógica de D1).
- AC7.2 — WHERE não há sessão anônima ativa, THE sistema SHALL usar
  `signInWithOAuth({ provider: "google" })` (login/criação direta).
- AC7.3 — WHEN o provedor Google retorna com sucesso, THE sistema SHALL
  estabelecer a sessão e redirecionar à tela inicial autenticada.
- AC7.4 — IF a conta Google já está vinculada a outro `user.id`, THEN THE sistema
  SHALL exibir mensagem clara e não corromper a sessão atual.
- AC7.5 — IF o usuário cancela o fluxo OAuth no Google, THEN THE sistema SHALL
  retornar à tela anterior sem erro bloqueante.

### Transversais

- AC0.1 — THE sistema SHALL exibir todas as mensagens de erro e sucesso em
  português, no padrão visual existente (toasts via `sonner`).
- AC0.2 — WHERE existem campos de senha, THE sistema SHALL oferecer alternância
  mostrar/ocultar (padrão já presente na home).
- AC0.3 — THE link "Crie sua conta" da home SHALL apontar para a nova rota de
  criação de conta (hoje aponta incorretamente para `/criar`, que cria sala).

---

## 4. Casos de Borda

| Caso | Tratamento esperado |
|------|---------------------|
| E-mail vazio / só espaços | Bloquear envio, erro de validação |
| E-mail sem `@` ou domínio | Bloquear envio (validação de formato) |
| Senha vazia | Bloquear envio |
| Senha = confirmação vazias | Bloquear envio |
| E-mail já cadastrado (AC1.5) | Mensagem "E-mail já cadastrado", sem vazar dados |
| Sessão anônima expirada/ausente ao criar conta | Fazer fallback para `signUp` (cria conta permanente nova) — documentar em design |
| Usuário já tem e-mail e tenta "criar conta" de novo | Redirecionar/avisar que já possui conta |
| Reenvio de confirmação em excesso | Respeitar `max_frequency` do Supabase; exibir aviso de "aguarde" |
| Link de confirmação/redefinição expirado (AC2.3, AC5.4) | Erro claro + opção de reiniciar |
| Recuperação para e-mail inexistente (AC4.2) | Mensagem neutra idêntica à de sucesso |
| Perda de conexão durante qualquer chamada | Capturar erro de rede, manter dados do formulário, permitir retry |
| Redefinir senha sem sessão de recuperação | Bloquear formulário, redirecionar ao fluxo "Esqueci a senha" |

---

## 5. Propriedades de Correção (invariantes)

- **P1 — Preservação de identidade:** Ao converter sessão anônima em conta, o
  `user.id` permanece o mesmo. ∀ conversão bem-sucedida: `user.id_antes ===
  user.id_depois`. (Garante que `salas.anfitriao` e `jogadores.user_id` continuam
  válidos.) — testável via PBT/integração.
- **P2 — Confirmação obrigatória:** Nenhuma conta criada por e-mail/senha obtém
  sessão ativa de login antes de o e-mail ser confirmado. ∀ conta nova: `login ⇒
  email_confirmed = true`.
- **P3 — Não-enumeração de e-mails (login + recuperação):** A resposta ao fluxo de
  recuperação (AC4.2) e ao login incorreto (AC3.2) é indistinguível entre "e-mail
  existe" e "não existe". **Exceção consciente:** a criação de conta (AC1.5)
  *revela* e-mails já cadastrados — é o comportamento de `updateUser`/`signUp` do
  Supabase e o padrão de mercado para signup; tradeoff aceito.
- **P4 — Política de senha:** ∀ senha aceita: `length >= minimum_password_length`.
- **P5 — Idempotência da validação cliente↔servidor:** Toda regra validada no
  cliente (formato de e-mail, tamanho de senha) também é garantida pelo Supabase
  Auth no servidor; o cliente nunca é a única linha de defesa.

---

## 6. Riscos / Pendências Técnicas (descobertas na análise)

1. **Discrepância de config:** `supabase/config.toml` tem
   `enable_anonymous_sign_ins = false` e `enable_manual_linking = false`, porém o
   app usa `signInAnonymously()` e `linkIdentity()`. Para D1 (converter via e-mail)
   e US7 (vincular Google) é **obrigatório** `enable_manual_linking = true`. → O
   design deve alinhar config local e remota.
2. **Confirmação desligada localmente:** `enable_confirmations = false`. D2 exige
   `true`. → Mudar config + verificar projeto remoto.
3. **Sender padrão (D4):** confirmado o uso do sender embutido do Supabase. Risco
   aceito: limite de taxa de e-mails. → O design não configura SMTP; apenas
   garante templates/redirects corretos e documenta o limite.
4. **URLs de redirect:** `site_url` e `additional_redirect_urls` precisam incluir
   o domínio de produção (Vercel) para os links de confirmação/redefinição e o
   callback do OAuth Google.
5. **Provedor Google (US7):** requer `[auth.external.google]` habilitado no
   Supabase com Client ID/Secret e a URL de callback registrada no Google Cloud
   Console. → Pré-requisito de deploy.

---

## 7. Checklist (pós-requisitos)

- [x] Todas as histórias no formato `Como [papel], quero [recurso], para [benefício]`
- [x] Todos os critérios em formato EARS
- [x] Casos de borda e erros documentados
- [x] Propriedades de correção definidas
- [x] **Stakeholder aprovou** (D1 converter, D2 confirmar, D3 e-mail+Google, D4 sender padrão)
