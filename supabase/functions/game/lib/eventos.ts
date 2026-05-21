// supabase/functions/game/lib/eventos.ts

export interface Evento {
  id: number;
  evento: string;
  local: string;
}

export const EVENTOS: Evento[] = [
  { id: 1,  evento: "Criação",                            local: "Jardim do Éden" },
  { id: 2,  evento: "Dilúvio",                            local: "Arca de Noé" },
  { id: 3,  evento: "Confusão das Línguas",               local: "Torre de Babel" },
  { id: 4,  evento: "Destruição de Sodoma e Gomorra",     local: "Casa de Ló" },
  { id: 5,  evento: "Jacó luta com o Anjo",               local: "Rio Jaboque" },
  { id: 6,  evento: "José interpreta os Sonhos do Faraó", local: "Palácio do Faraó" },
  { id: 7,  evento: "Êxodo",                              local: "Mar Vermelho" },
  { id: 8,  evento: "Moisés recebe as Tábuas da Lei",     local: "Monte Sinai" },
  { id: 9,  evento: "Adoração ao Bezerro de Ouro",        local: "Deserto do Sinai" },
  { id: 10, evento: "Dia da Expiação",                    local: "Diante do Véu do Santuário" },
  { id: 11, evento: "Queda das Muralhas de Jericó",       local: "Ao Redor das Muralhas" },
  { id: 12, evento: "Sansão derruba o Templo",            local: "Templo de Dagom" },
  { id: 13, evento: "Samuel ouve a Voz de Deus",          local: "Quarto na Cidade de Siló" },
  { id: 14, evento: "Davi derrota Golias",                local: "Vale de Elá" },
  { id: 15, evento: "Rainha de Sabá visita Salomão",      local: "Palácio de Salomão" },
  { id: 16, evento: "Elias enfrenta os Profetas de Baal", local: "Carmelo" },
  { id: 17, evento: "Jonas e o Grande Peixe",             local: "Ventre do Peixe" },
  { id: 18, evento: "Cativeiro da Babilônia",             local: "Fornalha Ardente" },
  { id: 19, evento: "Daniel na Cova dos Leões",           local: "Cova dos Leões" },
  { id: 20, evento: "Nascimento de Jesus",                local: "Manjedoura" },
  { id: 21, evento: "Milagre da Água em Vinho",           local: "Caná da Galileia" },
  { id: 22, evento: "Jesus e a Samaritana",               local: "Poço de Jacó" },
  { id: 23, evento: "Multiplicação dos Pães",             local: "Margens do Mar da Galileia" },
  { id: 24, evento: "Zaqueu tenta ver Jesus",             local: "Em Cima da Árvore" },
  { id: 25, evento: "Última Ceia",                        local: "Cenáculo" },
  { id: 26, evento: "Crucificação de Jesus",              local: "Gólgota" },
  { id: 27, evento: "Ressurreição de Jesus",              local: "Tumba Vazia" },
  { id: 28, evento: "Pentecostes",                        local: "Ruas de Jerusalém" },
  { id: 29, evento: "Conversão de Paulo",                 local: "Caminho de Damasco" },
  { id: 30, evento: "Paulo e Silas cantam na Prisão",     local: "Cela na Cidade de Filipos" },
  { id: 31, evento: "Paulo prega em Atenas",              local: "Areópago de Atenas" },
  { id: 32, evento: "João tem a Visão do Apocalipse",     local: "Ilha de Patmos" },
];
