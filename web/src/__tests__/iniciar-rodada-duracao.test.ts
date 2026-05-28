import { describe, it, expect } from "vitest";
import { calcularMinutosRodada } from "@shared/utils";
import { numEspias } from "@shared/espias";

describe("calcularMinutosRodada", () => {
  it("usa duracao_minutos quando a sala tem valor configurado", () => {
    expect(calcularMinutosRodada(7, 5, 1)).toBe(7);
    expect(calcularMinutosRodada(20, 12, 3)).toBe(20);
    expect(calcularMinutosRodada(3, 8, 2)).toBe(3);
  });

  it("usa a fórmula padrão quando duracao_minutos é null", () => {
    // 4 jogadores, 1 espia → 5 + 4 - 1 = 8
    expect(calcularMinutosRodada(null, 4, numEspias(4))).toBe(8);
    // 8 jogadores, 2 espias → 5 + 8 - 2 = 11
    expect(calcularMinutosRodada(null, 8, numEspias(8))).toBe(11);
    // 12 jogadores, 3 espias → 5 + 12 - 3 = 14
    expect(calcularMinutosRodada(null, 12, numEspias(12))).toBe(14);
  });

  it("usa a fórmula padrão quando duracao_minutos é undefined", () => {
    expect(calcularMinutosRodada(undefined, 5, 1)).toBe(9);
  });

  it("null e undefined caem na fórmula; qualquer número inteiro é respeitado diretamente", () => {
    // ?? só considera null/undefined, não 0 ou outros falsy — mas 0 nunca
    // chega aqui pois a constraint do banco exige duracao_minutos BETWEEN 3 AND 20
    expect(calcularMinutosRodada(null, 5, 1)).toBe(9);
    expect(calcularMinutosRodada(undefined, 5, 1)).toBe(9);
    expect(calcularMinutosRodada(5, 5, 1)).toBe(5);
  });
});

describe("numEspias", () => {
  it("1 espia para até 6 jogadores", () => {
    expect(numEspias(4)).toBe(1);
    expect(numEspias(6)).toBe(1);
  });

  it("2 espias para 7 a 9 jogadores", () => {
    expect(numEspias(7)).toBe(2);
    expect(numEspias(9)).toBe(2);
  });

  it("3 espias para 10 ou mais jogadores", () => {
    expect(numEspias(10)).toBe(3);
    expect(numEspias(12)).toBe(3);
  });
});
