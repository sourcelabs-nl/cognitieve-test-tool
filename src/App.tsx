// Top-level schermbeheer: profiel -> categorie -> sessie -> resultaat, met een
// apart voortgangsscherm. Volledig client-side; voortgang in localStorage.

import { useState } from 'react';
import type { Category, Mode, Profile, SessionResult } from './engine/types';
import { addResult, startEstimateForCategory } from './storage/history';
import { getProfile } from './storage/profiles';
import { ProfileSelect } from './ui/ProfileSelect';
import { CategorySelect } from './ui/CategorySelect';
import { SessionIntro } from './ui/SessionIntro';
import { Question } from './ui/Question';
import { Results } from './ui/Results';
import { Progress } from './ui/Progress';
import { Leaderboard } from './ui/Leaderboard';
import { PwaUpdater } from './ui/PwaUpdater';
import './App.css';

type Screen = 'profile' | 'category' | 'intro' | 'session' | 'results' | 'progress' | 'leaderboard';

interface SessionConfig {
  category: Category;
  mode: Mode;
  startEstimate: number;
  isReturning: boolean;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);

  const handleSelectProfile = (p: Profile) => {
    setProfile(p);
    setScreen('category');
  };

  // Bereidt een sessie voor: bepaal het startniveau uit de historie en toon
  // eerst het introscherm met de voorbeeldvraag.
  const handleStart = (category: Category, mode: Mode) => {
    const current = profile ? getProfile(profile.id) ?? profile : null;
    const hasHistory = current ? current.history.some((r) => r.category === category) : false;
    const startEstimate = current ? startEstimateForCategory(current, category) : 2.5;
    setConfig({ category, mode, startEstimate, isReturning: hasHistory });
    setScreen('intro');
  };

  const handleComplete = (result: SessionResult) => {
    if (!profile) return;
    const updated = addResult(profile.id, result) ?? getProfile(profile.id) ?? profile;
    setProfile(updated);
    setLastResult(result);
    setScreen('results');
  };

  return (
    <main className="app">
      <PwaUpdater />

      {screen === 'profile' && <ProfileSelect onSelect={handleSelectProfile} />}

      {screen === 'category' && profile && (
        <CategorySelect
          profile={profile}
          onStart={handleStart}
          onShowProgress={() => setScreen('progress')}
          onShowLeaderboard={() => setScreen('leaderboard')}
          onSwitchProfile={() => {
            setProfile(null);
            setScreen('profile');
          }}
        />
      )}

      {screen === 'intro' && config && (
        <SessionIntro
          category={config.category}
          mode={config.mode}
          startEstimate={config.startEstimate}
          isReturning={config.isReturning}
          onStart={() => setScreen('session')}
          onBack={() => setScreen('category')}
        />
      )}

      {screen === 'session' && config && (
        <Question
          key={`${config.category}-${config.mode}-${lastResult?.id ?? 'first'}`}
          category={config.category}
          mode={config.mode}
          startEstimate={config.startEstimate}
          onComplete={handleComplete}
          onQuit={() => setScreen('category')}
        />
      )}

      {screen === 'results' && lastResult && profile && (
        <Results
          result={lastResult}
          profile={profile}
          onRetry={() => config && handleStart(config.category, config.mode)}
          onHome={() => setScreen('category')}
          onShowProgress={() => setScreen('progress')}
          onShowLeaderboard={() => setScreen('leaderboard')}
        />
      )}

      {screen === 'progress' && profile && (
        <Progress profile={profile} onBack={() => setScreen('category')} />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard highlightName={profile?.name} onBack={() => setScreen('category')} />
      )}
    </main>
  );
}
