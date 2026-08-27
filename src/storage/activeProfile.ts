// Onthoudt welk profiel er het laatst gekozen is op dit apparaat.
//
// Het profiel staat bewust NIET in de URL. Een profiel-id in de adresbalk is een
// deelbare link naar andermans voortgang, en profielen op dit apparaat zijn niet
// met een wachtwoord gescheiden. Bovendien zegt de URL dan iets over wie je bent,
// terwijl hij alleen hoort te zeggen waar je bent.
//
// Maar zonder profiel is elk scherm behalve het profielscherm onbruikbaar, dus
// zonder dit geheugen zou elke herlaad daar alsnog eindigen en had het scherm in
// de URL weinig nut. Net als de laatst geziene versie hoort dit bij het apparaat,
// los van de export/import van voortgang.

import { deviceSetting } from './store';

const setting = deviceSetting('cognitieve-test-tool:active-profile');

export function rememberedProfileId(): string | null {
  return setting.read();
}

// `null` vergeet het profiel, bijvoorbeeld bij het wisselen van profiel.
export function rememberProfileId(id: string | null): void {
  setting.write(id);
}
