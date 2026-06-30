// Toont een melding wanneer er een nieuwe versie van de (geinstalleerde) PWA
// beschikbaar is, plus een bevestiging dat de app offline-klaar is. De service
// worker draait in 'prompt'-modus: updaten gebeurt pas als de gebruiker erop
// tikt.

import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaUpdater() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="pwa-toast" role="alert">
      {needRefresh ? (
        <>
          <span>Er is een nieuwe versie.</span>
          <button className="btn" onClick={() => updateServiceWorker(true)}>
            <RefreshCw size={18} /> Vernieuwen
          </button>
        </>
      ) : (
        <span>De app is klaar voor offline gebruik.</span>
      )}
      <button className="icon-button" onClick={close} aria-label="Sluiten">
        <X size={18} />
      </button>
    </div>
  );
}
