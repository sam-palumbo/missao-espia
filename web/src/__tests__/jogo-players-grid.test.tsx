import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { makePlayer } from "./helpers";

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

import { PlayersGrid } from "@/app/sala/[code]/jogo/players-grid";

const ALICE  = makePlayer({ id: "j1", apelido: "Alice",  ativo: true  });
const BOB    = makePlayer({ id: "j2", apelido: "Bob",    ativo: true  });
const CARLOS = makePlayer({ id: "j3", apelido: "Carlos", ativo: false });

describe("PlayersGrid", () => {
  it("mostra todos os jogadores", () => {
    render(<PlayersGrid players={[ALICE, BOB, CARLOS]} turnoAtual="j1" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("exibe as iniciais de cada jogador", () => {
    render(<PlayersGrid players={[ALICE, BOB]} turnoAtual="j1" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.getByText("BO")).toBeInTheDocument();
  });

  it("jogador eliminado tem opacity reduzida", () => {
    const { container } = render(
      <PlayersGrid players={[ALICE, CARLOS]} turnoAtual="j1" />
    );
    const wrappers = container.querySelectorAll<HTMLElement>("[style]");
    const eliminado = Array.from(wrappers).find(
      (el) => el.style.opacity === "0.4"
    );
    expect(eliminado).toBeDefined();
  });

  it("jogador ativo (turnoAtual) não tem opacity reduzida", () => {
    const { container } = render(
      <PlayersGrid players={[ALICE]} turnoAtual="j1" />
    );
    const wrappers = container.querySelectorAll<HTMLElement>("[style]");
    const comOpacity04 = Array.from(wrappers).filter(
      (el) => el.style.opacity === "0.4"
    );
    expect(comOpacity04).toHaveLength(0);
  });

  it("funciona sem turnoAtual definido", () => {
    render(<PlayersGrid players={[ALICE, BOB]} turnoAtual={undefined} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
