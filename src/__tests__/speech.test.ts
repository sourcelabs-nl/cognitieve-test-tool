import { describe, it, expect, beforeEach } from 'vitest';
import { pickBestVoice, rankVoices, resolveVoice, type VoiceLike } from '../ui/speech';
import { deviceSetting } from '../storage/store';

function voice(name: string, lang: string, voiceURI = name): VoiceLike {
  return { name, lang, voiceURI };
}

describe('rangschikking van stemmen', () => {
  it('kiest Google Nederlands, ook boven Premium (expliciete wens van de gebruiker)', () => {
    const best = pickBestVoice([
      voice('Ellen (Premium)', 'nl-NL'),
      voice('Claire (Verbeterd)', 'nl-NL'),
      voice('Google Nederlands', 'nl-NL'),
    ]);
    expect(best?.name).toBe('Google Nederlands');
  });

  it('valt terug op Premium/Enhanced zonder Google-stem (Apple-toestellen)', () => {
    const best = pickBestVoice([
      voice('Xander', 'nl-NL'),
      voice('Claire (Verbeterd)', 'nl-NL'),
      voice('Ellen (Premium)', 'nl-NL'),
    ]);
    expect(best?.name).toBe('Ellen (Premium)');
  });

  it('een Engelse Google-stem wint niet van een Nederlandse stem', () => {
    const best = pickBestVoice([voice('Google US English', 'en-US'), voice('Xander', 'nl-NL')]);
    expect(best?.name).toBe('Xander');
  });

  it('kiest een Enhanced-stem boven een gewone stem', () => {
    const best = pickBestVoice([voice('Xander', 'nl-NL'), voice('Claire (Enhanced)', 'nl-NL')]);
    expect(best?.name).toBe('Claire (Enhanced)');
  });

  it('kiest Premium boven Enhanced', () => {
    const best = pickBestVoice([voice('Claire (Enhanced)', 'nl-NL'), voice('Ellen (Premium)', 'nl-NL')]);
    expect(best?.name).toBe('Ellen (Premium)');
  });

  it('herkent ook de vertaalde naam "Verbeterd"', () => {
    const best = pickBestVoice([voice('Xander', 'nl-NL'), voice('Claire (Verbeterd)', 'nl-NL')]);
    expect(best?.name).toBe('Claire (Verbeterd)');
  });

  it('kiest nl-NL boven nl-BE bij gelijke kwaliteit', () => {
    const best = pickBestVoice([voice('Ellen', 'nl-BE'), voice('Xander', 'nl-NL')]);
    expect(best?.lang).toBe('nl-NL');
  });

  it('zet een niet-Nederlandse stem altijd achteraan, ook een Premium-stem', () => {
    const ranked = rankVoices([voice('Samantha (Premium)', 'en-US'), voice('Xander', 'nl-NL')]);
    expect(ranked[0].lang).toBe('nl-NL');
    expect(ranked[1].lang).toBe('en-US');
  });

  it('ontdubbelt stemmen met dezelfde voiceURI en taal', () => {
    const ranked = rankVoices([
      voice('Xander', 'nl-NL', 'urn:xander'),
      voice('Xander', 'nl-NL', 'urn:xander'),
    ]);
    expect(ranked).toHaveLength(1);
  });

  it('houdt dezelfde voiceURI in een andere taal apart', () => {
    const ranked = rankVoices([
      voice('Google Nederlands', 'nl-NL', 'urn:google'),
      voice('Google Nederlands', 'nl-BE', 'urn:google'),
    ]);
    expect(ranked).toHaveLength(2);
  });

  it('geeft op een lege lijst null in plaats van een crash', () => {
    expect(rankVoices([])).toEqual([]);
    expect(pickBestVoice([])).toBeNull();
  });
});

describe('terugval op de voorkeurstem', () => {
  const voices = [voice('Xander', 'nl-NL', 'urn:xander'), voice('Google Nederlands', 'nl-NL', 'urn:google')];

  it('gebruikt de opgeslagen voorkeur als die bestaat', () => {
    expect(resolveVoice(voices, 'urn:xander')?.name).toBe('Xander');
  });

  it('valt terug op de automatische keuze bij een onbekende voorkeur', () => {
    expect(resolveVoice(voices, 'urn:bestaat-niet')?.name).toBe('Google Nederlands');
  });

  it('kiest automatisch zonder voorkeur', () => {
    expect(resolveVoice(voices, null)?.name).toBe('Google Nederlands');
  });

  it('geeft null als er geen stemmen zijn', () => {
    expect(resolveVoice([], 'urn:xander')).toBeNull();
  });
});

// Eenvoudige localStorage-mock: Vitest draait in Node en heeft er geen.
function mockLocalStorage(): void {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
    },
  });
}

describe('apparaat-instellingen in localStorage', () => {
  // Dit patroon (lezen en schrijven met een try/catch om de privacymodus) stond
  // eerder drie keer los in de codebase. De test hoort nu bij de gedeelde helper.
  beforeEach(mockLocalStorage);

  it('is standaard leeg', () => {
    expect(deviceSetting('test:leeg').read()).toBeNull();
  });

  it('bewaart en leest een waarde', () => {
    const setting = deviceSetting('test:stem');
    setting.write('urn:google:nl');
    expect(setting.read()).toBe('urn:google:nl');
  });

  it('wist de waarde bij null', () => {
    const setting = deviceSetting('test:stem');
    setting.write('urn:google:nl');
    setting.write(null);
    expect(setting.read()).toBeNull();
  });

  it('houdt sleutels uit elkaar', () => {
    deviceSetting('test:a').write('een');
    deviceSetting('test:b').write('twee');
    expect(deviceSetting('test:a').read()).toBe('een');
    expect(deviceSetting('test:b').read()).toBe('twee');
  });

  it('crasht niet als localStorage niet beschikbaar is (privacymodus)', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('geblokkeerd');
      },
    });
    const setting = deviceSetting('test:stem');
    expect(() => setting.write('urn:iets')).not.toThrow();
    expect(setting.read()).toBeNull();
  });
});
