import type { Testament } from "./types.ts";
export type { Testament };

export interface Evento {
  id: number;
  evento: string;
  local: string;
  testament: Testament;
}

export const EVENTOS: readonly Evento[] = [
  { id: 1,  evento: "Criação",                            local: "Jardim do Éden",                testament: "AT" },
  { id: 2,  evento: "Dilúvio",                            local: "Arca de Noé",                    testament: "AT" },
  { id: 3,  evento: "Confusão das Línguas",               local: "Torre de Babel",                 testament: "AT" },
  { id: 4,  evento: "Destruição de Sodoma e Gomorra",     local: "Casa de Ló",                     testament: "AT" },
  { id: 5,  evento: "Jacó luta com o Anjo",               local: "Rio Jaboque",                    testament: "AT" },
  { id: 6,  evento: "José interpreta os Sonhos do Faraó", local: "Palácio do Faraó",               testament: "AT" },
  { id: 7,  evento: "Êxodo",                              local: "Mar Vermelho",                   testament: "AT" },
  { id: 8,  evento: "Moisés recebe as Tábuas da Lei",     local: "Monte Sinai",                    testament: "AT" },
  { id: 9,  evento: "Adoração ao Bezerro de Ouro",        local: "Deserto do Sinai",               testament: "AT" },
  { id: 10, evento: "Dia da Expiação",                    local: "Diante do Véu do Santuário",     testament: "AT" },
  { id: 11, evento: "Queda das Muralhas de Jericó",       local: "Ao Redor das Muralhas",          testament: "AT" },
  { id: 12, evento: "Sansão derruba o Templo",            local: "Templo de Dagom",                testament: "AT" },
  { id: 13, evento: "Samuel ouve a Voz de Deus",          local: "Quarto na Cidade de Siló",       testament: "AT" },
  { id: 14, evento: "Davi derrota Golias",                local: "Vale de Elá",                    testament: "AT" },
  { id: 15, evento: "Rainha de Sabá visita Salomão",      local: "Palácio de Salomão",             testament: "AT" },
  { id: 16, evento: "Elias enfrenta os Profetas de Baal", local: "Carmelo",                        testament: "AT" },
  { id: 17, evento: "Jonas e o Grande Peixe",             local: "Ventre do Peixe",                testament: "AT" },
  { id: 18, evento: "Cativeiro da Babilônia",             local: "Fornalha Ardente",               testament: "AT" },
  { id: 19, evento: "Daniel na Cova dos Leões",           local: "Cova dos Leões",                 testament: "AT" },
  { id: 20, evento: "Nascimento de Jesus",                local: "Manjedoura",                     testament: "NT" },
  { id: 21, evento: "Milagre da Água em Vinho",           local: "Caná da Galileia",               testament: "NT" },
  { id: 22, evento: "Jesus e a Samaritana",               local: "Poço de Jacó",                   testament: "NT" },
  { id: 23, evento: "Multiplicação dos Pães",             local: "Margens do Mar da Galileia",     testament: "NT" },
  { id: 24, evento: "Zaqueu tenta ver Jesus",             local: "Em Cima da Árvore",              testament: "NT" },
  { id: 25, evento: "Última Ceia",                        local: "Cenáculo",                       testament: "NT" },
  { id: 26, evento: "Crucificação de Jesus",              local: "Gólgota",                        testament: "NT" },
  { id: 27, evento: "Ressurreição de Jesus",              local: "Tumba Vazia",                    testament: "NT" },
  { id: 28, evento: "Pentecostes",                        local: "Ruas de Jerusalém",              testament: "NT" },
  { id: 29, evento: "Conversão de Paulo",                 local: "Caminho de Damasco",             testament: "NT" },
  { id: 30, evento: "Paulo e Silas cantam na Prisão",     local: "Cela na Cidade de Filipos",      testament: "NT" },
  { id: 31, evento: "Paulo prega em Atenas",              local: "Areópago de Atenas",             testament: "NT" },
  { id: 32, evento: "João tem a Visão do Apocalipse",     local: "Ilha de Patmos",                 testament: "NT" },
] as const;

export const getEventoById = (id: number): Evento | undefined =>
  EVENTOS.find(e => e.id === id);

export const getEventosByTestament = (t: Testament): readonly Evento[] =>
  EVENTOS.filter(e => e.testament === t);
