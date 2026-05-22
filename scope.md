# Missão Espia — Escopo do Web App

App mobile-first para jogar Missão Espia pelo navegador, sem instalação.

---

## Visão Geral

Cada jogador acessa o app pelo próprio celular. O app distribui as cartas, controla o tempo, gerencia votações e mantém a pontuação — substituindo as cartas físicas e o cronômetro.

---

## Autenticação

- Jogar sem conta é sempre possível — basta entrar com um apelido (sessão anônima via Supabase Auth).
- Criar conta é opcional e desbloqueia histórico de partidas e pontuação acumulada.
- Login social (Google) como única opção para simplificar.
- Usuário anônimo pode vincular conta Google a qualquer momento sem perder histórico da sessão.

---

## Fluxos Principais

### 1. Tela Inicial
- Botão **Criar Sala**
- Botão **Entrar em Sala** (campo para código)
- Acesso opcional a login/cadastro com Google

### 2. Criar Sala
- Anfitrião define o apelido (ou usa nome da conta Google)
- Anfitrião define o **número de rodadas** (mínimo 1)
- Anfitrião pode definir uma **senha opcional** para restringir acesso
- App gera um **código de sala** de 4 letras para compartilhar
- Anfitrião aguarda jogadores na sala

### 3. Entrar em Sala
- Jogador digita o código de 4 letras e escolhe um apelido
- Se a sala tiver senha, um campo de senha é exibido
- Entra na sala e aguarda o anfitrião iniciar

### 4. Lobby (sala de espera)
- Lista de jogadores conectados em tempo real
- Número de espias calculado automaticamente pela tabela de regras
- Número de rodadas configurado pelo anfitrião visível para todos
- Somente o anfitrião pode iniciar a partida

### 5. Tela do Jogo — Jogador Comum
- Exibe a carta: **evento + local**
- Timer regressivo visível
- Lista de jogadores com destaque em quem é o turno atual
- Botão **Acusar** (disponível no início do próprio turno)

### 6. Tela do Jogo — Espia
- Exibe: **"Você é o Espia"** — sem evento, sem local
- Mesmos controles do jogador comum
- Botão adicional: **Adivinhar** (disponível a qualquer momento)

### 7. Votação
- Triggered quando um jogador propõe acusação
- Todos veem quem foi acusado e votam simultaneamente (👍 / 👎)
- Acusado não vê botão de voto
- Resultado exibido após todos votarem
- Contador de eliminações erradas visível

### 8. Adivinhação do Espia
- Espia seleciona o evento de uma lista suspensa (a lista pública de 32 eventos)
- Confirmação antes de enviar
- Resultado revelado para todos imediatamente

### 9. Tela de Resultado (por rodada)
- Revela quem era o(s) espia(s) e o evento da rodada
- Pontuação da rodada por jogador
- Pontuação acumulada da sessão
- Se ainda houver rodadas: botão **Próxima Rodada**
- Na última rodada: botão **Ver Placar Final** ou **Encerrar**

### 10. Placar Final
- Ranking de todos os jogadores com pontuação total da sessão
- Botão **Nova Partida** (reinicia sala com os mesmos jogadores) ou **Encerrar**

---

## Funcionalidades

### Essenciais (MVP)
- [ ] Criar e entrar em salas por código
- [ ] Senha opcional de sala
- [ ] Número de rodadas definido pelo anfitrião
- [ ] Autenticação híbrida: anônimo + Google opcional
- [ ] Distribuição automática de cartas (evento + espia)
- [ ] Timer com fórmula: 5 min + jogadores − espias (ex: 4 jogadores e 1 espia = 8 min; 7 jogadores e 2 espias = 10 min; 12 jogadores e 3 espias = 14 min)
- [ ] Controle de turnos em sentido horário: cada jogador faz uma pergunta a qualquer outro
- [ ] O perguntado deve responder (sem passar), podendo ser vago ou específico
- [ ] Primeira rodada: não há perguntas, cada jogador apenas diz uma única palavra relacionada ao evento ou local
- [ ] Controle de turnos em tempo real
- [ ] Fluxo de acusação e votação
- [ ] Adivinhação do espia com lista pública
- [ ] Pontuação automática por rodada
- [ ] Tela de resultado ao fim de cada rodada
- [ ] Placar final ao fim da partida

### Secundárias
- [x] Chat de texto durante a partida (tempo real via Supabase Realtime)
- [ ] Histórico de partidas para contas Google
- [ ] Contador de eliminações erradas com alerta de limite
- [ ] Animações de revelação de carta e resultado
- [ ] Chat de voz integrado durante a partida (LiveKit)
- [ ] Modo variante: Espias Aliados

### Fora do Escopo (por ora)
- App nativo (iOS/Android)
- Criação de eventos customizados pelo usuário
- PWA / suporte offline

---

## Arquitetura Backend

### Princípio
Toda lógica de jogo é autoritativa no servidor. Clientes só leem o banco; toda ação passa por uma Edge Function que valida, persiste e dispara Realtime.

### Edge Function: `game`
Roteamento por campo `action`:

| Action | Responsabilidade |
|---|---|
| `criar_sala` | Gera código, cria sala, insere anfitrião |
| `entrar_sala` | Valida código + senha, insere jogador |
| `iniciar_rodada` | Sorteia evento, define espias, inicia timer |
| `proximo_turno` | Avança turno, verifica timer |
| `acusar` | Abre fase de votação |
| `votar` | Registra voto, resolve acusação se completa |
| `adivinhar` | Espia submete palpite, resolve rodada |
| `encerrar_rodada` | Calcula pontuação, avança rodada ou encerra partida |

### Schema (Postgres via Supabase)

```sql
salas (
  id, codigo UNIQUE, anfitriao, status,
  num_rodadas, rodada_atual,
  senha_hash,   -- bcrypt, nullable (sala pública se null)
  criada_em
)

jogadores (
  id, sala_id, user_id, apelido,
  pontuacao, ativo, conectado, entrou_em
)

rodadas (
  id, sala_id, numero, evento_id,
  estado JSONB,   -- fase, turno_atual, espia_ids, timer_end, ...
  iniciada_em, encerrada_em
)

votos (
  id, rodada_id, votante_id, acusado_id,
  aprovado, criado_em,
  UNIQUE (rodada_id, votante_id)
)
```

### Realtime
Canal por sala (`sala:<codigo>`). Clientes assinam mudanças em `rodadas.estado` e `jogadores` para atualizar a UI sem polling.

### RLS
- Leitura: jogador autenticado membro da sala.
- Escrita: bloqueada para clientes — apenas a Edge Function usa a service role key.

---

## Regras já definidas

As regras estão documentadas em [`regras.md`](regras.md) e a lista de eventos em [`lista_eventos_locais.md`](lista_eventos_locais.md). O app deve implementá-las sem adaptações.

---

## Stack Tecnológica

Definida em [`stack.md`](stack.md). Resumo:

- **Framework:** Next.js (App Router)
- **Backend/DB/Auth/Realtime:** Supabase
- **Hospedagem:** Vercel
- **Styling:** Tailwind CSS v4 + Shadcn UI
- **Animações:** Motion (Framer)

---

## Decisões em Aberto

- [ ] Expiração automática de salas inativas (TTL)
- [ ] Reconexão de jogador que cai durante a partida
