# Missão Espia — Escopo do Web App

App mobile-first para jogar Missão Espia pelo navegador, sem instalação.

---

## Visão Geral

Cada jogador acessa o app pelo próprio celular. O app distribui as cartas, controla o tempo, gerencia votações e mantém a pontuação — substituindo as cartas físicas e o cronômetro.

---

## Autenticação

- Jogar sem conta é sempre possível — basta entrar com um apelido.
- Criar conta é opcional e desbloqueia histórico de partidas e pontuação acumulada.
- Login social (Google) como única opção para simplificar.

---

## Fluxos Principais

### 1. Tela Inicial
- Botão **Criar Sala**
- Botão **Entrar em Sala** (campo para código)
- Acesso opcional a login/cadastro

### 2. Criar Sala
- Anfitrião define o apelido (ou usa conta)
- App gera um **código de sala** de 4 letras para compartilhar
- Anfitrião aguarda jogadores na sala

### 3. Entrar em Sala
- Jogador digita o código e escolhe um apelido
- Entra na sala e aguarda o anfitrião iniciar

### 4. Lobby (sala de espera)
- Lista de jogadores conectados em tempo real
- Número de espias calculado automaticamente pela tabela de regras
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

### 9. Tela de Resultado
- Revela quem era o(s) espia(s) e o evento da rodada
- Pontuação da rodada por jogador
- Pontuação acumulada da sessão
- Botões: **Nova Rodada** (mesmo grupo) ou **Encerrar**

---

## Funcionalidades

### Essenciais (MVP)
- [ ] Criar e entrar em salas por código
- [ ] Distribuição automática de cartas (evento + espia)
- [ ] Timer com fórmula: 5 min + jogadores − espias
- [ ] Controle de turnos em tempo real
- [ ] Fluxo de acusação e votação
- [ ] Adivinhação do espia com lista pública
- [ ] Pontuação automática por rodada
- [ ] Tela de resultado ao fim da rodada

### Secundárias
- [ ] Contas opcionais com histórico de partidas
- [ ] Pontuação acumulada entre rodadas da mesma sessão
- [ ] Contador de eliminações erradas com alerta de limite
- [ ] Modo variante: Espias Aliados
- [ ] Animações de revelação de carta e resultado
- [ ] Chat de voz integrado durante a partida

### Fora do Escopo (por ora)
- App nativo (iOS/Android)
- Criação de eventos customizados pelo usuário

---

## Regras já definidas

As regras estão documentadas em [`regras.md`](regras.md) e a lista de eventos em [`lista_eventos_locais.md`](lista_eventos_locais.md). O app deve implementá-las sem adaptações.

---

## Stack Tecnológica

Definida em [`stack.md`](stack.md). Resumo:

- **Framework:** Next.js (App Router)
- **Backend/DB/Auth:** Supabase
- **Hospedagem:** Vercel
- **Styling:** Tailwind CSS v4 + Shadcn UI
- **Realtime:** Supabase Realtime (WebSockets gerenciados)

---

## Decisões em Aberto

- [ ] Expiração de salas (tempo limite de inatividade)
- [ ] Suporte offline ou PWA
