// Changelog voor de gebruiker: wat er in deze versie is veranderd.
//
// De nieuwste release staat bovenaan en bepaalt tegelijk de versie van de app
// (`APP_VERSION`). Bij een nieuwe versie voeg je hier een blok bovenaan toe;
// de app onthoudt welke versie de gebruiker al gezien heeft en toont alleen
// wat daarna is bijgekomen.
//
// De lezers zijn geen IT-ers. Schrijf daarom uitsluitend wat er voor hen
// verandert, in gewone taal en vanuit de gebruiker: "je kunt nu ...", niet "de
// generator ondersteunt nu ...". Concreet:
//
// - Alleen functionele wijzigingen. Een technische verbetering die je in de app
//   niet merkt, hoort hier niet thuis.
// - Geen vakjargon (knop, scherm en niveau mogen; raster, reeks en regel alleen
//   als de gebruiker die woorden zelf in de app ziet staan).
// - Niet uitleggen hoe iets werkt of hoe het vroeger was. Beschrijf de nieuwe
//   situatie, kort.
// - Een punt is een of twee zinnen. Wordt het langer, dan zit er waarschijnlijk
//   techniek in die eruit kan.

export interface Release {
  version: string;
  date: string; // ISO-datum
  items: string[];
}

export const releases: Release[] = [
  {
    version: '1.2.4',
    date: '2026-08-27',
    items: [
      'Twee soorten letteropgaven die vergezocht waren, zijn vervangen: je krijgt geen opgaven meer die je alleen met een gok kunt oplossen.',
    ],
  },
  {
    version: '1.2.3',
    date: '2026-08-27',
    items: [
      'In de testmodus heeft elke vraag nu een tijdslimiet, net als in de echte test. Je ziet een balk aftellen. Moeilijkere vragen krijgen meer tijd. Bij het oefenen blijft de tijd vrij.',
      'Haal je een hoger niveau, dan krijg je een korte felicitatie in beeld.',
      'Woordrelaties zijn prettiger te lezen op een telefoon.',
      'De voorleesstem klinkt beter. Je kunt zelf een stem kiezen: tik op je avatar linksboven.',
      'De terugknop van je telefoon werkt nu in de app, en als je de pagina ververst blijf je op hetzelfde scherm. Ververs je tijdens een test, dan blijf je ook in de test.',
      'Op het categoriescherm staat een knop "Beginscherm" om terug te gaan naar het kiezen van een profiel.',
    ],
  },
  {
    version: '1.2.2',
    date: '2026-08-26',
    items: [
      'Is er iets nieuws, dan zie je deze kaart meteen bovenaan in beeld.',
      'Met "Bekijk oudere versies" lees je terug wat er in eerdere versies is veranderd.',
      'Onderaan het scherm waar je je profiel kiest staat een knop "Wat is nieuw?", zodat je deze lijst altijd terug kunt vinden.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-08-26',
    items: [
      'De knop om verder te gaan staat nu midden in beeld, zodat je na een antwoord meteen door kunt.',
      'Heb je hulp gevraagd, dan verdwijnt de hulptekst zodra je hebt geantwoord. De uitleg vertelt vanaf dat moment alles wat je nodig hebt.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-26',
    items: [
      'Er zijn drie nieuwe soorten vragen bijgekomen, dezelfde soorten die je in de echte cognitieve capaciteitentest van de politie tegenkomt.',
      'Cijfers in vakjes: er is een vakje leeg en dat vul jij in.',
      '"Welke hoort niet in de rij": in een rij cijfers of letters past er precies een niet. Jij wijst hem aan.',
      'Dubbele woordrelaties: soms ontbreken er twee woorden in plaats van een, en kies je uit vier woordparen. Er zijn er 40 bijgekomen.',
      'De hoogste niveaus zijn moeilijker geworden en er is meer afwisseling in de opgaven, ook op de lagere niveaus.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-08-24',
    items: [
      'Er is een niveau 6 bijgekomen, voor als niveau 5 te makkelijk wordt.',
      'Niveau 5 is moeilijker geworden.',
      'De woordrelaties zijn uitgebreid met 18 nieuwe, moeilijkere opgaven.',
      'Nieuw op het voortgangsscherm: de knop "Beoordeel mijn voortgang" geeft een korte analyse met je sterke punten, je verbeterpunten en een concrete volgende stap.',
    ],
  },
];

export const APP_VERSION = releases[0].version;

// Releases die nieuwer zijn dan de laatst geziene versie. Kent de app de
// opgeslagen versie niet (bijvoorbeeld na een grote sprong of na het wissen van
// browserdata), dan tonen we alleen de nieuwste release: een lange lijst met
// oude wijzigingen leest toch niemand.
export function releasesSince(lastSeen: string | null): Release[] {
  if (lastSeen === APP_VERSION) return [];
  if (lastSeen === null) return releases.slice(0, 1);
  const index = releases.findIndex((r) => r.version === lastSeen);
  return index === -1 ? releases.slice(0, 1) : releases.slice(0, index);
}

// De rest van de changelog: alles wat niet al in de kaart staat. Wat de kaart
// toont is altijd een aaneengesloten rij vanaf de nieuwste release, dus wat
// daarna komt is de oudere historie. Bedoeld voor het uitklapbare deel van de
// kaart, zodat iemand die een versie heeft overgeslagen alsnog terug kan lezen.
export function olderReleases(shown: Release[]): Release[] {
  return releases.slice(shown.length);
}

export interface PendingInput {
  lastSeen: string | null; // laatst geziene versie op dit apparaat
  hasProfiles: boolean; // is de app hier al eerder gebruikt?
}

// Wat er bij het laden getoond moet worden. Een gebruiker die de app voor het
// eerst opent krijgt geen changelog: die heeft de "oude" versie nooit gezien.
export function pendingReleases({ lastSeen, hasProfiles }: PendingInput): Release[] {
  if (lastSeen === null && !hasProfiles) return [];
  return releasesSince(lastSeen);
}
