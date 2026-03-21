import { db, schema } from "./index.js";

async function seed() {
  console.log("Seeding database...");

  // Insert countries
  await db.insert(schema.countries).values([
    {
      name: "Argentina",
      code: "AR",
      flag_emoji: "\u{1F1E6}\u{1F1F7}",
      description:
        "A Argentina e o segundo maior pais da America do Sul, conhecida pelo tango, futebol e suas vastas paisagens.",
    },
    {
      name: "Chile",
      code: "CL",
      flag_emoji: "\u{1F1E8}\u{1F1F1}",
      description:
        "O Chile e um pais longo e estreito na costa oeste da America do Sul, famoso por seus vinhos e paisagens diversas.",
    },
    {
      name: "Peru",
      code: "PE",
      flag_emoji: "\u{1F1F5}\u{1F1EA}",
      description:
        "O Peru e um pais rico em historia e cultura, lar do Imperio Inca e de Machu Picchu.",
    },
  ]);

  console.log("Countries seeded.");

  // Get country IDs
  const countriesResult = await db.select().from(schema.countries);
  const argentina = countriesResult.find((c) => c.code === "AR")!;
  const chile = countriesResult.find((c) => c.code === "CL")!;
  const peru = countriesResult.find((c) => c.code === "PE")!;

  // Insert clues for Argentina
  const argentinaClues = [
    {
      country_id: argentina.id,
      category: "geografia" as const,
      clue_text:
        "Este pais abriga a Patagonia, uma das regioes mais ao sul do mundo",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: argentina.id,
      category: "cultura" as const,
      clue_text:
        "O tango nasceu nos bairros populares deste pais no final do seculo XIX",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: argentina.id,
      category: "gastronomia" as const,
      clue_text:
        "O asado (churrasco) e considerado quase uma religiao neste pais",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: argentina.id,
      category: "historia" as const,
      clue_text:
        "Eva Peron, conhecida como Evita, foi primeira-dama deste pais",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: argentina.id,
      category: "curiosidade" as const,
      clue_text:
        "Este pais tem o ponto mais alto das Americas, o Monte Aconcagua",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: argentina.id,
      category: "esporte" as const,
      clue_text: "Diego Maradona e Lionel Messi nasceram neste pais",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: argentina.id,
      category: "musica" as const,
      clue_text:
        "O folclore e a milonga sao generos musicais tradicionais deste pais",
      difficulty: "dificil" as const,
      points_value: 30,
    },
    {
      country_id: argentina.id,
      category: "economia" as const,
      clue_text:
        "Este pais e um dos maiores produtores mundiais de soja e carne bovina",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: argentina.id,
      category: "geografia" as const,
      clue_text:
        "A cidade de Ushuaia, neste pais, e conhecida como o 'fim do mundo'",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: argentina.id,
      category: "cultura" as const,
      clue_text:
        "O mate e a bebida nacional deste pais, consumida em rodas sociais",
      difficulty: "medio" as const,
      points_value: 20,
    },
  ];

  // Insert clues for Chile
  const chileClues = [
    {
      country_id: chile.id,
      category: "geografia" as const,
      clue_text:
        "Este pais e o mais longo do mundo, estendendo-se por mais de 4.300 km de norte a sul",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: chile.id,
      category: "cultura" as const,
      clue_text:
        "Pablo Neruda, ganhador do Nobel de Literatura, nasceu neste pais",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: chile.id,
      category: "gastronomia" as const,
      clue_text:
        "A empanada de pino e um dos pratos mais tradicionais deste pais",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: chile.id,
      category: "historia" as const,
      clue_text:
        "Augusto Pinochet governou este pais como ditador de 1973 a 1990",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: chile.id,
      category: "curiosidade" as const,
      clue_text: "O Deserto do Atacama, o mais seco do mundo, fica neste pais",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: chile.id,
      category: "esporte" as const,
      clue_text:
        "Alexis Sanchez e um dos jogadores de futebol mais famosos deste pais",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: chile.id,
      category: "musica" as const,
      clue_text: "A cueca e a danca nacional deste pais",
      difficulty: "dificil" as const,
      points_value: 30,
    },
    {
      country_id: chile.id,
      category: "economia" as const,
      clue_text: "Este pais e o maior produtor mundial de cobre",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: chile.id,
      category: "geografia" as const,
      clue_text:
        "A Ilha de Pascoa, famosa pelas estatuas Moai, pertence a este pais",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: chile.id,
      category: "cultura" as const,
      clue_text:
        "As festividades de La Tirana sao patrimonio cultural deste pais",
      difficulty: "dificil" as const,
      points_value: 30,
    },
  ];

  // Insert clues for Peru
  const peruClues = [
    {
      country_id: peru.id,
      category: "geografia" as const,
      clue_text:
        "Machu Picchu, uma das 7 maravilhas do mundo moderno, fica neste pais",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: peru.id,
      category: "cultura" as const,
      clue_text:
        "Este pais foi o centro do Imperio Inca, o maior das Americas pre-colombianas",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: peru.id,
      category: "gastronomia" as const,
      clue_text: "O ceviche e considerado o prato nacional deste pais",
      difficulty: "facil" as const,
      points_value: 10,
    },
    {
      country_id: peru.id,
      category: "historia" as const,
      clue_text: "Francisco Pizarro conquistou este pais no seculo XVI",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: peru.id,
      category: "curiosidade" as const,
      clue_text:
        "O Lago Titicaca, o lago navegavel mais alto do mundo, fica na fronteira deste pais",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: peru.id,
      category: "esporte" as const,
      clue_text:
        "Paolo Guerrero e um dos maiores idolos do futebol deste pais",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: peru.id,
      category: "musica" as const,
      clue_text: "A marinera e a danca nacional deste pais",
      difficulty: "dificil" as const,
      points_value: 30,
    },
    {
      country_id: peru.id,
      category: "economia" as const,
      clue_text:
        "Este pais e um dos maiores produtores mundiais de prata e ouro",
      difficulty: "medio" as const,
      points_value: 20,
    },
    {
      country_id: peru.id,
      category: "geografia" as const,
      clue_text:
        "A Amazonia cobre cerca de 60% do territorio deste pais",
      difficulty: "dificil" as const,
      points_value: 30,
    },
    {
      country_id: peru.id,
      category: "cultura" as const,
      clue_text:
        "As Linhas de Nazca sao figuras gigantes no deserto deste pais",
      difficulty: "medio" as const,
      points_value: 20,
    },
  ];

  await db
    .insert(schema.clues)
    .values([...argentinaClues, ...chileClues, ...peruClues]);

  console.log("Clues seeded (30 total).");
  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
