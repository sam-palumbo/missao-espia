# Design: Polish & Tests

**Date:** 2026-05-23
**Scope:** Code polish + missing unit tests + E2E smoke tests

---

## 1. Shared mock helpers

**File:** `web/src/__tests__/helpers.ts`

Extract all duplicated vi.mock boilerplate from the 10 existing test files into a single shared module. No behavior changes — only structure.

Exports:
- `mockMotion()` — Proxy-based motion/react stub (motion.div etc. render as plain HTML tags, AnimatePresence is a passthrough)
- `mockDesign()` — stubs for ParchmentBg, InsetFrame, MEMedallion, MEAvatar, MERule, MEIcon, Eyebrow, PrimaryBtn, T, F
- `mockSupabase(data?)` — createClient stub; `data` is the object returned by `.single()`, defaults to `{ id: "sala-1" }`. Pass `{ id: "sala-1", status: "jogando" }` for resultado tests, `{ id: "sala-1" }` for placar tests.
- `mockGameActions()` — all gameActions entries as vi.fn()
- `mockSonner()` — toast.error as vi.fn()
- `mockNextNavigation()` — useRouter returning `{ push: vi.fn() }`
- `makeRodada(top?, estado?)` — returns a valid RodadaAtual; `top` merges into the root fields (id, numero, evento_id, encerrada_em), `estado` merges into the nested estado object
- `makePlayer(overrides?)` — returns a valid Player with sensible defaults

Each of the 10 existing test files replaces its vi.mock blocks with calls to these helpers. Tests must stay green after the refactor.

---

## 2. Unit tests for resultado and placar pages

### `web/src/__tests__/resultado.test.tsx`

Uses shared helpers. Mocks: useGameState, usePlayers, useAuth, useRouter, supabase (with `{ id: "sala-1", status: "jogando" }` default), EVENTOS, design, motion, sonner.

Test cases:
1. Shows "Vitória do grupo" banner when spy was caught and `adivinhou_evento_id` is null
2. Shows "Vitória do espia" banner when spy was not caught (spy still active)
3. Shows "Vitória do espia" when spy caught but `adivinhou_evento_id !== null` (guessed correctly)
4. Shows spy's apelido in the spy section
5. "Local da rodada" shows "Toque para revelar" initially
6. After tapping the reveal button, shows the evento local
7. Shows "+1 pt" badge when spy guessed (`adivinhou_evento_id !== null`)
8. Shows "0 pt" badge when spy did not guess
9. Players are sorted by score descending in the ranking list
10. Shows "Próxima Rodada" button when sala status is "jogando"
11. Shows "Ver Placar Final" button when sala status is "encerrada"

### `web/src/__tests__/placar.test.tsx`

Uses shared helpers. Mocks: usePlayers, useAuth, useRouter, supabase, design.

Test cases:
1. Players are sorted by score descending
2. First-place player with pontuacao > 0 shows "✦" symbol
3. Other players show their rank number (2, 3, …)
4. Clicking "Nova Partida" navigates to "/"
5. Clicking "Encerrar" navigates to "/"

---

## 3. E2E smoke tests — criar page

**Delete:** `web/e2e/perguntas.spec.ts`, `web/e2e/primeira-rodada.spec.ts`, `web/e2e/timer.spec.ts`

**Create:** `web/e2e/criar.spec.ts`

Follows the same pattern as `entrar-codigo.spec.ts` — tests UI behavior only, no network calls required.

Test cases:
1. Page renders with nickname input visible
2. "Criar Sala" button is disabled when nickname is empty
3. Button enables once nickname has at least 1 character
4. Typing then clearing the nickname disables the button again
5. Num-rodadas selector is visible on the page
6. Nickname input has the expected placeholder text

---

## Constraints

- No behavior changes to production code
- All 66 existing unit tests must remain green after the helpers refactor
- E2E tests must pass against the dev server (`npm run dev`) with no backend
- No new dependencies
