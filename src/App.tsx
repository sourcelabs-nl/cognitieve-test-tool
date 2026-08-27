// Top-level schermbeheer: profiel -> categorie -> sessie -> resultaat, met een
// apart voortgangsscherm. Volledig client-side; voortgang in localStorage.
//
// Welk scherm je ziet staat in de URL (zie state/route.ts). Dit component kent
// alleen de opgeloste route en navigeert; het rekenen aan URL's gebeurt daar.

import { useEffect, useMemo, useState } from 'react';
import type { Category, Mode, Profile, SessionResult } from './engine/types';
import { addResult, startEstimateForCategory } from './storage/history';
import { getProfile, setAvatar, setVoice } from './storage/profiles';
import { setActiveVoice } from './ui/speech';
import { rememberedProfileId, rememberProfileId } from './storage/activeProfile';
import {
  buildHash,
  navigate,
  parseHash,
  replaceHash,
  resolveRoute,
  useHash,
} from './state/route';
import { markVersionSeen, newReleases } from './storage/appVersion';
import { releases as allReleases } from './data/whatsNew';
import { WhatsNew } from './ui/WhatsNew';
import { ProfileSelect } from './ui/ProfileSelect';
import { CategorySelect } from './ui/CategorySelect';
import { SessionIntro } from './ui/SessionIntro';
import { Question } from './ui/Question';
import { Results } from './ui/Results';
import { Progress } from './ui/Progress';
import { Leaderboard } from './ui/Leaderboard';
import { PwaUpdater } from './ui/PwaUpdater';
import './App.css';

interface SessionConfig {
  category: Category;
  mode: Mode;
  startEstimate: number;
  isReturning: boolean;
}

// Bepaalt het startniveau uit de historie van dit profiel.
function buildConfig(profile: Profile | null, category: Category, mode: Mode): SessionConfig {
  const current = profile ? getProfile(profile.id) ?? profile : null;
  const hasHistory = current ? current.history.some((r) => r.category === category) : false;
  const startEstimate = current ? startEstimateForCategory(current, category) : 2.5;
  return { category, mode, startEstimate, isReturning: hasHistory };
}

// Het laatst gekozen profiel, als het nog bestaat. Zonder dit zou elke herlaad
// op het profielscherm eindigen en had het scherm in de URL weinig nut.
function rememberedProfile(): Profile | null {
  const id = rememberedProfileId();
  return id ? getProfile(id) ?? null : null;
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(rememberedProfile);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  // Loopt er op dit moment echt een sessie? Alleen dan is #/sessie te tonen;
  // na een herlaad is de sessie weg en sturen we terug naar de intro.
  const [sessionLive, setSessionLive] = useState(false);
  // Eenmalig bij het laden bepalen; daarna verdwijnt de kaart pas als de
  // gebruiker hem wegklikt.
  const [releases, setReleases] = useState(newReleases);
  // Zelf opgevraagd vanaf het profielscherm, ook als er niets nieuws is.
  const [changelogOpen, setChangelogOpen] = useState(false);

  // De voorleesknoppen zitten verspreid over het hele scherm, dus de stem van
  // het actieve profiel wordt hier eenmalig doorgegeven in plaats van als prop
  // overal langs. Zonder profiel valt de app terug op de apparaat-voorkeur.
  useEffect(() => {
    setActiveVoice(profile?.voiceURI ?? null);
  }, [profile?.voiceURI]);

  // Automatisch toont de kaart alles wat na de laatst geziene versie kwam.
  // Zelf opgevraagd begint hij bij de nieuwste release; de rest van de historie
  // zit daar uitklapbaar onder.
  const cardReleases = releases.length > 0 ? releases : changelogOpen ? allReleases.slice(0, 1) : [];

  // De URL vraagt om een scherm, resolveRoute bepaalt welk scherm daarvan echt
  // te tonen is met wat er nu in het geheugen zit.
  const hash = useHash();
  const route = resolveRoute(parseHash(hash), {
    hasProfile: profile !== null,
    hasSession: sessionLive,
    hasResult: lastResult !== null,
  });
  const screen = route.screen;
  const routeHash = buildHash(route);
  // Categorie en modus komen allebei uit de URL, zodat een herlaad je in dezelfde
  // sessie-instellingen terugzet. Zonder de modus in de URL werd een test na een
  // herlaad stilzwijgend een oefensessie.
  const routeCategory = screen === 'intro' || screen === 'session' ? route.category : null;
  const routeMode: Mode = screen === 'intro' || screen === 'session' ? route.mode : 'practice';

  // Wijkt de getoonde route af van wat de balk zegt, dan corrigeren we de balk
  // met een vervanging (geen nieuwe entry, anders komt de terugknop in een lus).
  // De ruwe hash hoort in de dependencies: ook een andere onzin-URL die op
  // hetzelfde scherm uitkomt moet rechtgezet worden.
  useEffect(() => {
    replaceHash(routeHash);
  }, [hash, routeHash]);

  // Afgeleid, niet bewaard: alles in een sessie-configuratie volgt uit het
  // profiel en de categorie en modus in de URL. Als state zou hij bij elke
  // navigatie bijgewerkt moeten worden en kon hij achterlopen op de URL.
  const config = useMemo(
    () => (routeCategory === null ? null : buildConfig(profile, routeCategory, routeMode)),
    [profile, routeCategory, routeMode],
  );

  const dismissWhatsNew = () => {
    markVersionSeen();
    setReleases([]);
    setChangelogOpen(false);
  };

  const handleSelectProfile = (p: Profile) => {
    setProfile(p);
    rememberProfileId(p.id);
    navigate({ screen: 'category' });
  };

  // Bereidt een sessie voor: bepaal het startniveau uit de historie en toon
  // eerst het introscherm met de voorbeeldvraag.
  const handleStart = (category: Category, mode: Mode) => {
    setSessionLive(false);
    navigate({ screen: 'intro', category, mode });
  };

  const handleChangeAvatar = (avatarId: string) => {
    if (!profile) return;
    const updated = setAvatar(profile.id, avatarId);
    if (updated) setProfile(updated);
  };

  const handleChangeVoice = (voiceURI: string | null) => {
    if (!profile) return;
    const updated = setVoice(profile.id, voiceURI);
    if (updated) setProfile(updated);
  };

  const handleComplete = (result: SessionResult) => {
    if (!profile) return;
    const updated = addResult(profile.id, result) ?? getProfile(profile.id) ?? profile;
    setProfile(updated);
    setLastResult(result);
    setSessionLive(false);
    navigate({ screen: 'results' });
  };

  return (
    <main className="app">
      <PwaUpdater />

      <WhatsNew releases={cardReleases} onDismiss={dismissWhatsNew} />

      {screen === 'profile' && (
        <ProfileSelect
          onSelect={handleSelectProfile}
          onShowChangelog={() => setChangelogOpen(true)}
        />
      )}

      {screen === 'category' && profile && (
        <CategorySelect
          profile={profile}
          onStart={handleStart}
          onShowProgress={() => navigate({ screen: 'progress' })}
          onShowLeaderboard={() => navigate({ screen: 'leaderboard' })}
          onChangeAvatar={handleChangeAvatar}
          onChangeVoice={handleChangeVoice}
          onSwitchProfile={() => {
            setProfile(null);
            rememberProfileId(null);
            navigate({ screen: 'profile' });
          }}
        />
      )}

      {screen === 'intro' && config && (
        <SessionIntro
          // Sleutel op de categorie, net als bij Question. Zonder dit blijft het
          // component staan als je van de ene intro-URL naar de andere gaat, en
          // hou je de voorbeeldvraag van de vorige categorie in beeld. Via de
          // knoppen kan dat niet, maar met een geplakte of bewaarde URL wel.
          key={config.category}
          category={config.category}
          mode={config.mode}
          startEstimate={config.startEstimate}
          isReturning={config.isReturning}
          onStart={() => {
            setSessionLive(true);
            navigate({ screen: 'session', category: config.category, mode: config.mode });
          }}
          onBack={() => navigate({ screen: 'category' })}
        />
      )}

      {screen === 'session' && config && (
        <Question
          key={`${config.category}-${config.mode}-${lastResult?.id ?? 'first'}`}
          category={config.category}
          mode={config.mode}
          startEstimate={config.startEstimate}
          onComplete={handleComplete}
          onQuit={() => {
            setSessionLive(false);
            navigate({ screen: 'category' });
          }}
        />
      )}

      {screen === 'results' && lastResult && profile && (
        <Results
          result={lastResult}
          profile={profile}
          // Opnieuw betekent hetzelfde nog eens: dezelfde categorie en dezelfde
          // modus als de sessie die net is afgerond.
          onRetry={() => handleStart(lastResult.category, lastResult.mode)}
          onHome={() => navigate({ screen: 'category' })}
          onShowProgress={() => navigate({ screen: 'progress' })}
          onShowLeaderboard={() => navigate({ screen: 'leaderboard' })}
        />
      )}

      {screen === 'progress' && profile && (
        <Progress profile={profile} onBack={() => navigate({ screen: 'category' })} />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard highlightName={profile?.name} onBack={() => navigate({ screen: 'category' })} />
      )}
    </main>
  );
}
