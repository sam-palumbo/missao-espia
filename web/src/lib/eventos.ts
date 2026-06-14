// Fonte ÚNICA dos 32 eventos: @shared/eventos — a mesma lista que o servidor usa
// para sortear e pontuar. Antes havia uma cópia idêntica aqui, que podia divergir
// da do servidor ao editar só um lado. Reexportamos para os imports já existentes
// ("@/lib/eventos") seguirem válidos sem tocar nas páginas.
export { EVENTOS } from "@shared/eventos";
export type { Evento } from "@shared/eventos";
