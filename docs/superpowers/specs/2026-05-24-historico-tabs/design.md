# Design — Histórico em Tabs por Turno

## Arquitetura Geral

Duas camadas de mudança:
1. **Backend** (Edge Function `game/`): rastrear `turno_numero_atual` no estado e gravar `turno_numero` em cada item do histórico.
2. **Frontend** (Next.js `web/`): componente `HistoricoTabs` que agrupa `historico` por `turno_numero` e renderiza uma barra de tabs.

---

## Backend

### 1. Mudança em `EstadoRodada`

Adicionar `turno_numero_atual: number` ao estado da rodada. Começa em `1` quando a rodada é iniciada.

```ts
// lib/types.ts (backend e frontend)
export interface EstadoRodada {
  // ... campos existentes ...
  turno_numero_atual: number;  // novo — controla qual turno estamos gravando
}
```

### 2. Mudança em `HistoricoPergunta` e `HistoricoTurnoPresencial`

```ts
export interface HistoricoPergunta {
  tipo?: "pergunta";
  turno_numero: number;   // novo
  perguntador_apelido: string;
  destinatario_apelido: string;
  pergunta: string;
  resposta: string;
}

export interface HistoricoTurnoPresencial {
  tipo: "turno_presencial";
  turno_numero: number;   // novo
  jogador_apelido: string;
}
```

`HistoricoVotacao` **não** recebe `turno_numero` — é sempre uma tab independente.

### 3. Lógica de incremento

O `turno_numero_atual` incrementa **depois** de gravar o item do último jogador do ciclo atual.

Detecção: o ciclo está completo quando o índice do `turno_atual` em `ordem_turnos` é o último (`idx === ordem_turnos.length - 1`).

```ts
// padrão aplicado em responder-pergunta.ts e proximo-turno.ts
const turnoNumero = estado.turno_numero_atual;
const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
const isUltimoDoCiclo = idx === estado.ordem_turnos.length - 1;
const proximoTurnoNumero = isUltimoDoCiclo
  ? turnoNumero + 1
  : turnoNumero;

// gravar item com turno_numero: turnoNumero
// gravar estado com turno_numero_atual: proximoTurnoNumero
```

### 4. `iniciar-rodada.ts`

Ao criar o estado inicial, definir `turno_numero_atual: 1`.

### 5. Retrocompatibilidade

Rodadas existentes sem `turno_numero_atual` no estado: o campo será `undefined`. O frontend trata `undefined` como `1` (todos os itens legados vão para "Turno 1"). O backend não precisa migrar dados históricos.

---

## Frontend

### Algoritmo de agrupamento (`groupHistorico`)

```ts
type TabGroup =
  | { kind: "turno"; numero: number; items: HistoricoItem[] }
  | { kind: "votacao"; item: HistoricoVotacao; index: number };

function groupHistorico(historico: HistoricoItem[]): TabGroup[] {
  // Percorre o array na ordem; cada votacao vira grupo próprio;
  // pergunta/turno_presencial agrupados por turno_numero (ou 1 se ausente).
  // Grupos de turno são criados na primeira vez que o numero aparece.
}
```

### Componente `HistoricoTabs`

Arquivo: `web/src/app/sala/[code]/jogo/historico-tabs.tsx`

Props:
```ts
interface Props {
  historico: HistoricoItem[];
  palavrasPrimeiraRodada: PalavraPrimeiraRodada[];
  primeiraRodada: boolean;
}
```

Estrutura:
- Barra de tabs horizontal com scroll (`overflow-x: auto`, no scrollbar)
- Tab ativa: background `T.sienna`, texto branco
- Tab inativa: background `T.cardWarm`, texto `T.inkSoft`
- Tab de votação: rótulo "Votação" + ícone de espia
- Tab de turno: rótulo "Turno N"
- Conteúdo da tab selecionada abaixo da barra (reutiliza o JSX existente)

### Seleção automática

```ts
const [selectedTab, setSelectedTab] = useState<number>(0);
const prevGroupCount = useRef(0);

useEffect(() => {
  const isOnLastTab = selectedTab === groups.length - 1;
  if (groups.length > prevGroupCount.current) {
    // nova tab criada — avança automaticamente
    setSelectedTab(groups.length - 1);
  }
  prevGroupCount.current = groups.length;
}, [groups.length]);
// Nota: se usuário mudou de tab manualmente (selectedTab !== groups.length-1),
// a nova tab vai aparecer mas não vai forçar retorno.
```

Wait — a lógica acima sempre avança para a última tab quando uma nova é criada, mesmo que o usuário esteja em outra tab. Isso está alinhado com RF-4: *se o usuário navegou para tab anterior, a seleção NÃO deve ser alterada*. 

Correção: só avança se o usuário **já estava na última tab** antes da nova ser criada.

```ts
useEffect(() => {
  if (groups.length > prevGroupCount.current) {
    const wasOnLast = selectedTab === prevGroupCount.current - 1;
    if (wasOnLast) setSelectedTab(groups.length - 1);
    prevGroupCount.current = groups.length;
  }
}, [groups.length]);
```

### Integração em `jogo/page.tsx`

Substituir o bloco `{/* Histórico - Infinite scroll frame */}` pelo componente `<HistoricoTabs>`. Histórico vazio: retorna `null` (sem card).

---

## Testes

### Backend (Deno)
- `responder-pergunta`: item adicionado ao histórico tem `turno_numero` correto; `turno_numero_atual` incrementa no último jogador do ciclo.
- `proximo-turno` (presencial): idem.
- `iniciar-rodada`: `turno_numero_atual` começa em `1`.

### Frontend (Vitest + Testing Library)
Arquivo: `web/src/__tests__/jogo-historico-tabs.test.tsx`

| Caso | Verificação |
|------|-------------|
| historico vazio | nenhuma tab renderizada |
| 2 perguntas no turno 1 | uma tab "Turno 1" com 2 itens |
| perguntas em turno 1 e turno 2 | duas tabs; turno 2 selecionado por padrão |
| votação entre turnos | tab "Votação" intercalada |
| usuário em tab anterior, nova tab criada | seleção anterior preservada |
| usuário na última tab, nova tab criada | avança para nova tab |
| dados legados sem turno_numero | todos agrupados em "Turno 1" |
| modo presencial com turno_presencial | agrupamento igual ao online |

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/game/lib/types.ts` | `turno_numero` em HistoricoPergunta/HistoricoTurnoPresencial; `turno_numero_atual` em EstadoRodada |
| `supabase/functions/game/handlers/iniciar-rodada.ts` | inicializar `turno_numero_atual: 1` |
| `supabase/functions/game/handlers/responder-pergunta.ts` | gravar `turno_numero`; atualizar `turno_numero_atual` |
| `supabase/functions/game/handlers/proximo-turno.ts` | gravar `turno_numero` no item presencial; atualizar `turno_numero_atual` |
| `web/src/lib/types.ts` | espelho das mudanças de tipos |
| `web/src/app/sala/[code]/jogo/historico-tabs.tsx` | novo componente |
| `web/src/app/sala/[code]/jogo/page.tsx` | substituir bloco histórico por `<HistoricoTabs>` |
| `web/src/__tests__/jogo-historico-tabs.test.tsx` | novo arquivo de testes |
