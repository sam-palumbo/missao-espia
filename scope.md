# Missão Espia — Escopo do Web App

App mobile-first para jogar Missão Espia pelo navegador, sem instalação.

---

## Visão Geral

Cada jogador acessa o app pelo próprio celular. O app distribui as cartas, controla o tempo, gerencia votações e mantém a pontuação — substituindo as cartas físicas e o cronômetro.

Dois modos de jogo:
- **Online**: perguntas e respostas digitadas no app
- **Presencial**: jogadores interagem verbalmente, app só gerencia turnos e cartas

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
- Anfitrião escolhe o **modo**: `online` ou `presencial`
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
- Número de rodadas e modo da sala visíveis para todos
- Anfitrião pode trocar o modo (online ↔ presencial) antes de iniciar
- Somente o anfitrião pode iniciar a partida

### 5. Primeira Rodada

Na primeira rodada **não há perguntas**.

#### Modo Online:
- Cada jogador diz **uma única palavra** relacionada ao evento/local no seu turno
- Botão: **Dizer Palavra**
- Palavras são registradas e visíveis no histórico

#### Modo Presencial:
- Jogadores interagem verbalmente
- Apenas avança o turno: **Próximo Turno**
- Histórico registra qual jogador agiu em cada turno

### 6. Turnos de Pergunta (demais rodadas)

#### Modo Online:
- Jogador do turno faz uma pergunta para qualquer outro
  - Botão **Fazer Pergunta** (escolhe destinatário + digita texto)
- Destinatário responde
  - Botão **Responder**
- Ambos perguntas e respostas vão para o histórico

#### Modo Presencial:
- Apenas avanço de turno
- Botão **Próximo Turno**

### 7. Tela do Jogo — Jogador Comum
- Exibe a carta: **evento + local**
- Timer regressivo visível
- Lista de jogadores com destaque em quem é o turno atual
- Botão **Acusar** (disponível no início do próprio turno)

### 8. Tela do Jogo — Espia
- Exibe: **"Você é o Espia"** — sem evento, sem local
- Mesmos controles do jogador comum
- Botão adicional: **Adivinhar** (disponível a qualquer momento)

### 9. Tela do Jogo — Jogador Eliminado

- Exibe banner: **"Você foi eliminado — apenas observe"**
- Todos os botões de ação ficam ocultos (Acusar, Fazer Pergunta, Adivinhar)
- Overlay de votação exibe mensagem de observador em vez dos botões de voto
- O jogador eliminado permanece visível na grade de jogadores com estilo acinzentado e texto riscado
- Seu turno é removido de `ordem_turnos` no backend — o jogo nunca para esperando sua ação

### 10. Votação
- Triggered quando um jogador propõe acusação
- Todos veem quem foi acusado e votam simultaneamente (👍 / 👎)
- Acusado não vê botão de voto
- Resultado exibido após todos votarem
- Contador de eliminações erradas visível

### 11. Adivinhação do Espia
- Espia seleciona o evento de uma lista suspensa (a lista pública de 32 eventos, agrupada por Antigo/Novo Testamento)
- Confirmação antes de enviar
- Resultado revelado para todos imediatamente

### 12. Tela de Resultado (por rodada)
- Revela quem era o(s) espia(s) e o evento da rodada
- Pontuação da rodada por jogador
- Pontuação acumulada da sessão
- Se ainda houver rodadas: botão **Próxima Rodada**
- Na última rodada: botão **Ver Placar Final** ou **Encerrar**

### 13. Placar Final
- Ranking de todos os jogadores com pontuação total da sessão
- Botão **Nova Partida** (reinicia sala com os mesmos jogadores) ou **Encerrar**

### 14. Chat (opcional)
- Chat de texto em tempo real durante toda a partida
- Mensagens exibem apelido do jogador

---

## Funcionalidades

### Essenciais (MVP)
- [x] Criar e entrar em salas por código
- [x] Senha opcional de sala
- [x] Número de rodadas definido pelo anfitrião
- [x] Autenticação híbrida: anônimo + Google opcional
- [x] Modo online e modo presencial
- [x] Distribuição automática de cartas (evento + espia)
- [x] Timer com fórmula: 5 min + jogadores − espias
- [x] Primeira rodada: uma palavra por jogador (online) ou avanço de turno (presencial)
- [x] Controle de turnos em tempo real
- [x] Perguntas e respostas digitadas (modo online)
- [x] Fluxo de acusação e votação
- [x] Adivinhação do espia com lista pública
- [x] Pontuação automática por rodada
- [x] Tela de resultado ao fim de cada rodada
- [x] Placar final ao fim da partida

### Secundárias
- [x] Chat de texto durante a partida (tempo real via Supabase Realtime)
- [ ] Histórico de partidas para contas Google
- [ ] Animações de revelação de carta e resultado
- [ ] Chat de voz integrado durante a partida (LiveKit)
- [ ] Modo variante: Espias Aliados

### Fora do Escopo (por ora)
- App nativo (iOS/Android)
- Criação de eventos customizados pelo usuário
- PWA / suporte offline

---

## Regras de Negócio

### Número de Espias
| Jogadores | Espias |
|-----------|--------|
| 4 – 6     | 1      |
| 7 – 9     | 2      |
| 10 – 12   | 3      |

### Tolerância a Eliminações Erradas
| Jogadores | Espias | Eliminações erradas toleradas |
|-----------|--------|-------------------------------|
| 4         | 1      | 0 (nenhuma — qualquer erro encerra) |
| 5 – 6     | 1      | 1                             |
| 7 – 9     | 2      | 2                             |
| 10 – 12   | 3      | 3                             |

### Pontuação

| Situação | Espia | Grupo (membros ativos) |
|----------|-------|------------------------|
| Pego e não adivinha | 0 | 1 cada |
| Pego e adivinha | 1 | 0 |
| Não pego e não adivinha | 2 | 0 |
| Não pego e adivinha | 3 | 0 |

---

## Arquitetura Backend

### Princípio
Toda lógica de jogo é autoritativa no servidor. Clientes só leem o banco; toda ação passa por uma Edge Function que valida, persiste e dispara Realtime.

### Edge Function: `game`
Roteamento por campo `action`:

| Action | Responsabilidade |
|---|---|
| `criar_sala` | Gera código, cria sala, insere anfitrião |
| `entrar_sala` | Valida código + senha, insere jogador (ou reconecta) |
| `definir_modo` | Anfitrião troca modo: online ↔ presencial (antes de iniciar) |
| `iniciar_rodada` | Sorteia evento, define espias, randomiza turnos, inicia timer |
| `proximo_turno` | Avança turno (apenas modo presencial) |
| `dizer_palavra` | Registra palavra da primeira rodada e avança turno |
| `fazer_pergunta` | Registra pergunta e muda fase para `aguardando_resposta` |
| `responder_pergunta` | Registra resposta, grava no histórico, avança turno |
| `acusar` | Abre fase de votação |
| `votar` | Registra voto, resolve acusação quando todos votarem |
| `adivinhar` | Espia submete palpite, resolve rodada |
| `encerrar_rodada` | Calcula pontuação, avança rodada ou encerra partida |

### Schema (Postgres via Supabase)

```sql
salas (
  id           UUID PRIMARY KEY,
  codigo       TEXT UNIQUE NOT NULL,
  anfitriao    UUID REFERENCES auth.users,
  status       TEXT NOT NULL DEFAULT 'aguardando'
                 CHECK (status IN ('aguardando', 'jogando', 'encerrada')),
  modo         TEXT NOT NULL DEFAULT 'online'
                 CHECK (modo IN ('online', 'presencial')),
  num_rodadas  INT NOT NULL CHECK (num_rodadas >= 1),
  rodada_atual INT NOT NULL DEFAULT 0,
  senha_hash   TEXT,
  criada_em    TIMESTAMPTZ NOT NULL DEFAULT now()
)

jogadores (
  id         UUID PRIMARY KEY,
  sala_id    UUID NOT NULL REFERENCES salas ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users ON DELETE SET NULL,
  apelido    TEXT NOT NULL,
  pontuacao  INT NOT NULL DEFAULT 0,
  ativo      BOOLEAN NOT NULL DEFAULT true,
  conectado  BOOLEAN NOT NULL DEFAULT true,
  entrou_em  TIMESTAMPTZ NOT NULL DEFAULT now()
)

rodadas (
  id           UUID PRIMARY KEY,
  sala_id      UUID NOT NULL REFERENCES salas ON DELETE CASCADE,
  numero       INT NOT NULL,
  evento_id    INT NOT NULL,
  estado       JSONB NOT NULL DEFAULT '{}',
  iniciada_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  encerrada_em TIMESTAMPTZ,
  UNIQUE (sala_id, numero)
)

votos (
  id         UUID PRIMARY KEY,
  rodada_id  UUID NOT NULL REFERENCES rodadas ON DELETE CASCADE,
  votante_id UUID NOT NULL REFERENCES jogadores ON DELETE CASCADE,
  acusado_id UUID NOT NULL REFERENCES jogadores ON DELETE CASCADE,
  aprovado   BOOLEAN NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rodada_id, votante_id, acusado_id)
)

mensagens (
  id         UUID PRIMARY KEY,
  sala_id    UUID NOT NULL REFERENCES salas ON DELETE CASCADE,
  jogador_id UUID NOT NULL REFERENCES jogadores ON DELETE CASCADE,
  apelido    TEXT NOT NULL,
  texto      TEXT NOT NULL,
  criada_em  TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### Estrutura do `estado` (JSONB em `rodadas`)

```typescript
interface EstadoRodada {
  fase: "jogando" | "aguardando_resposta" | "votacao" | "adivinhacao" | "resultado";
  turno_atual: string;           // jogador_id
  ordem_turnos: string[];        // array de jogador_id
  espia_ids: string[];            // array de jogador_id
  timer_end: string;              // ISO string
  eliminacoes_erradas: number;
  acusado_id: string | null;
  acusou_neste_turno: boolean;
  adivinhou_evento_id: number | null;
  pergunta_atual: {
    perguntador_id: string;
    perguntador_apelido: string;
    destinatario_id: string;
    destinatario_apelido: string;
    texto: string;
  } | null;
  historico: HistoricoItem[];
  primeira_rodada: boolean;
  palavras_primeira_rodada: { jogador_id: string; apelido: string; palavra: string }[];
}
```

### Realtime
- Salas/subscrições: `sala:<codigo>`, `rodada:<sala_id>`, `players:<sala_id>`
- Clientes assinam mudanças em `rodadas.estado` e `jogadores` para atualizar a UI sem polling
- Polling de fallback a cada 3s para maior confiabilidade

### RLS
- Leitura: jogador autenticado membro da sala
- Escrita: bloqueada para clientes — apenas a Edge Function usa a service role key

---

## Regras já definidas

As regras completas estão documentadas em [`regras.md`](regras.md) e a lista de 32 eventos em [`lista_eventos_locais.md`](lista_eventos_locais.md).

---

## Stack Tecnológica

Definida em [`stack.md`](stack.md). Resumo:
- **Framework:** Next.js (App Router)
- **Backend/DB/Auth/Realtime:** Supabase
- **Hospedagem:** Vercel
- **Styling:** Tailwind CSS v4 + Shadcn UI

---

## Decisões em Aberto
- [ ] Expiração automática de salas inativas (TTL)
- [ ] Reconexão robusta de jogador que cai durante a partida
