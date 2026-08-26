// Changelog voor de gebruiker: wat er in deze versie is veranderd.
//
// De nieuwste release staat bovenaan en bepaalt tegelijk de versie van de app
// (`APP_VERSION`). Bij een nieuwe versie voeg je hier een blok bovenaan toe;
// de app onthoudt welke versie de gebruiker al gezien heeft en toont alleen
// wat daarna is bijgekomen.
//
// Schrijf de punten in gewone taal en vanuit de gebruiker: "je kunt nu ...",
// niet "de generator ondersteunt nu ...".

export interface Release {
  version: string;
  date: string; // ISO-datum
  items: string[];
}

export const releases: Release[] = [
  {
    version: '1.2.1',
    date: '2026-08-26',
    items: [
      'De knop om verder te gaan staat nu midden in beeld, boven de uitleg, zodat je hem meteen ziet en niet meer hoeft te scrollen na een lang antwoord.',
      'Heb je hulp gevraagd, dan verdwijnt de hulptekst zodra je hebt geantwoord. De uitleg vertelt vanaf dat moment het hele verhaal.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-26',
    items: [
      'Er zijn drie nieuwe soorten vragen bijgekomen, dezelfde soorten die je in de echte cognitieve capaciteitentest van de politie tegenkomt.',
      'Cijferpatronen in een raster: getallen staan in vakjes en de regel loopt per rij of per kolom. Een vakje is leeg, dat vul jij in.',
      '"Welke hoort niet in de rij": een rij cijfers of letters volgt bijna helemaal een regel, en precies een van hen breekt hem. Jij wijst hem aan.',
      'Dubbele woordrelaties: er ontbreken nu soms twee woorden in plaats van een, en je kiest uit vier woordparen. Er zijn er 40 bijgekomen.',
      'De reeksen op niveau 5 en 6 zijn zwaarder geworden. Er komen nu ook reeksen voorbij waarin drie bewerkingen elkaar afwisselen, waarin de stap afhangt van de plek in de reeks, en waarin je pas het patroon ziet als je de verschillen van de verschillen bekijkt.',
      'Bij letterpatronen op het hoogste niveau kun je nu een reeks tegenkomen die je vanaf de achterkant van het alfabet moet tellen.',
      'Staan er twee of drie reeksen door elkaar, dan hoort het vraagteken niet langer altijd bij de eerste reeks. Je moet dus zelf kijken welke reeks aan de beurt is.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-08-24',
    items: [
      'Er is een niveau 6 bijgekomen. De opgaven gaan door waar het oude plafond lag: reeksen waarvan de regel uit twee stappen bestaat, drie reeksen door elkaar, en woordrelaties met abstracte verbanden.',
      'Niveau 5 is zwaarder geworden. Opgaven die vooral om herkennen vroegen (zoals priemgetallen) staan nu op niveau 4.',
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
