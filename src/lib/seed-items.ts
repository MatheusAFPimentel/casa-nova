export type SeedItem = {
  category: string;
  name: string;
};

export const CATEGORIES = [
  "Cozinha",
  "Quarto",
  "Sala",
  "Banheiro",
  "Lavanderia e Limpeza",
  "Eletrodomésticos",
  "Diversos",
] as const;

export const SEED_ITEMS: SeedItem[] = [
  // Cozinha
  { category: "Cozinha", name: "Geladeira" },
  { category: "Cozinha", name: "Fogão" },
  { category: "Cozinha", name: "Micro-ondas" },
  { category: "Cozinha", name: "Liquidificador" },
  { category: "Cozinha", name: "Cafeteira" },
  { category: "Cozinha", name: "Panela de pressão" },
  { category: "Cozinha", name: "Jogo de panelas" },
  { category: "Cozinha", name: "Jogo de facas" },
  { category: "Cozinha", name: "Jogo de talheres" },
  { category: "Cozinha", name: "Jogo de pratos" },
  { category: "Cozinha", name: "Jogo de copos" },
  { category: "Cozinha", name: "Potes herméticos" },
  { category: "Cozinha", name: "Escorredor de louça" },
  { category: "Cozinha", name: "Tábua de corte" },
  { category: "Cozinha", name: "Filtro/purificador de água" },
  { category: "Cozinha", name: "Lixeira de cozinha" },
  { category: "Cozinha", name: "Jogo americano/toalha de mesa" },

  // Quarto
  { category: "Quarto", name: "Cama box + colchão" },
  { category: "Quarto", name: "Travesseiros" },
  { category: "Quarto", name: "Jogo de lençol" },
  { category: "Quarto", name: "Cobertor/edredom" },
  { category: "Quarto", name: "Guarda-roupa" },
  { category: "Quarto", name: "Criado-mudo" },
  { category: "Quarto", name: "Cabideiros" },
  { category: "Quarto", name: "Cortinas" },
  { category: "Quarto", name: "Espelho" },

  // Sala
  { category: "Sala", name: "Sofá" },
  { category: "Sala", name: "Mesa de centro" },
  { category: "Sala", name: "Rack ou painel de TV" },
  { category: "Sala", name: "TV" },
  { category: "Sala", name: "Tapete" },
  { category: "Sala", name: "Luminária" },
  { category: "Sala", name: "Mesa de jantar + cadeiras" },
  { category: "Sala", name: "Estante" },

  // Banheiro
  { category: "Banheiro", name: "Jogo de toalhas" },
  { category: "Banheiro", name: "Tapete de banheiro" },
  { category: "Banheiro", name: "Lixeira de banheiro" },
  { category: "Banheiro", name: "Suporte de escova de dente" },
  { category: "Banheiro", name: "Cortina/box de box" },
  { category: "Banheiro", name: "Organizador de produtos" },

  // Lavanderia e Limpeza
  { category: "Lavanderia e Limpeza", name: "Máquina de lavar" },
  { category: "Lavanderia e Limpeza", name: "Varal" },
  { category: "Lavanderia e Limpeza", name: "Ferro de passar" },
  { category: "Lavanderia e Limpeza", name: "Tábua de passar" },
  { category: "Lavanderia e Limpeza", name: "Vassoura e rodo" },
  { category: "Lavanderia e Limpeza", name: "Balde" },
  { category: "Lavanderia e Limpeza", name: "Kit produtos de limpeza" },
  { category: "Lavanderia e Limpeza", name: "Cesto de roupa suja" },

  // Eletrodomésticos (gerais / conforto)
  { category: "Eletrodomésticos", name: "Ventilador" },
  { category: "Eletrodomésticos", name: "Ar-condicionado" },
  { category: "Eletrodomésticos", name: "Aspirador de pó" },
  { category: "Eletrodomésticos", name: "Ferro elétrico" },
  { category: "Eletrodomésticos", name: "Sanduicheira/grill" },

  // Diversos
  { category: "Diversos", name: "Kit ferramentas básico" },
  { category: "Diversos", name: "Extintor de incêndio" },
  { category: "Diversos", name: "Fechaduras/chaves reserva" },
  { category: "Diversos", name: "Roteador Wi-Fi" },
  { category: "Diversos", name: "Cortina de box/persianas" },
];
