import { assertEquals, assertThrows } from "std/assert";
import { validarTrocaModo } from "./modo.ts";

Deno.test("aceita troca para 'presencial' quando user é anfitrião e sala aguardando", () => {
  validarTrocaModo({
    userId: "user-1",
    sala: { anfitriao: "user-1", status: "aguardando" },
    novoModo: "presencial",
  });
});

Deno.test("aceita troca para 'online' quando user é anfitrião e sala aguardando", () => {
  validarTrocaModo({
    userId: "user-1",
    sala: { anfitriao: "user-1", status: "aguardando" },
    novoModo: "online",
  });
});

Deno.test("rejeita quando user não é anfitrião", () => {
  assertThrows(
    () => validarTrocaModo({
      userId: "user-2",
      sala: { anfitriao: "user-1", status: "aguardando" },
      novoModo: "presencial",
    }),
    Error,
    "Apenas o anfitrião",
  );
});

Deno.test("rejeita quando sala já está jogando", () => {
  assertThrows(
    () => validarTrocaModo({
      userId: "user-1",
      sala: { anfitriao: "user-1", status: "jogando" },
      novoModo: "presencial",
    }),
    Error,
    "Não é possível trocar o modo após iniciar",
  );
});

Deno.test("rejeita modo inválido", () => {
  assertThrows(
    () => validarTrocaModo({
      userId: "user-1",
      sala: { anfitriao: "user-1", status: "aguardando" },
      novoModo: "hibrido" as unknown as "presencial",
    }),
    Error,
    "Modo inválido",
  );
});
