// Motiverende "Wist je dat..."-feiten over hersentraining. Bewust kort en
// bemoedigend, met een reden waarom oefenen helpt. Getoond op het eindscherm
// en een keer halverwege een sessie.

export interface Fact {
  title: string;
  body: string;
}

export const facts: Fact[] = [
  {
    title: 'Wist je dat... oefenen echt helpt?',
    body: 'Bij dit soort tests gaat een deel van je score omhoog puur door te oefenen: je leert de patronen sneller herkennen. Dat heet het oefeneffect.',
  },
  {
    title: 'Wist je dat... fouten je verder helpen?',
    body: 'Je hersenen onthouden een patroon beter nadat je het eerst fout had en daarna de uitleg zag. Een fout is dus geen mislukking, maar een leermoment.',
  },
  {
    title: 'Wist je dat... korte sessies het beste werken?',
    body: 'Regelmatig een korte sessie levert meer op dan af en toe heel lang oefenen. Verspreid oefenen (spaced practice) laat kennis beter beklijven.',
  },
  {
    title: 'Wist je dat... patroonherkenning een kernvaardigheid is?',
    body: 'Cijfer- en letterreeksen meten je fluïde intelligentie: het vermogen om nieuwe problemen op te lossen zonder voorkennis. Die vaardigheid gebruik je elke dag.',
  },
  {
    title: 'Wist je dat... uitdaging je brein laat groeien?',
    body: 'Items die net iets te moeilijk zijn prikkelen je het meest. Daarom wordt de test vanzelf zwaarder als het goed gaat: zo blijf je in je groeizone.',
  },
  {
    title: 'Wist je dat... woordrelaties je woordenschat versterken?',
    body: 'Analogieën dwingen je om verbanden tussen begrippen te zien. Dat verdiept je woordenschat en je vermogen om logisch te redeneren met taal.',
  },
  {
    title: 'Wist je dat... rust ook telt?',
    body: 'Een goede nachtrust helpt je hersenen om wat je geoefend hebt op te slaan. Slaap is dus een onderdeel van je training.',
  },
  {
    title: 'Wist je dat... zelfvertrouwen meetelt?',
    body: 'Wie rustig blijft en op zichzelf vertrouwt, presteert beter op tests. Door te oefenen raak je vertrouwd met de vraagvormen en neemt de spanning af.',
  },
];

// Kiest een willekeurig feit. Optioneel een feit uitsluiten (bijvoorbeeld het
// feit dat halverwege al getoond werd).
export function randomFact(exclude?: Fact): Fact {
  const pool = exclude ? facts.filter((f) => f !== exclude) : facts;
  return pool[Math.floor(Math.random() * pool.length)];
}
