import { useState, useEffect } from 'react';

// iOS Safari nunca dispara 'beforeinstallprompt' (não existe nesse
// navegador) — sem isso, quem usa iPhone nunca via o banner. Detecta
// iPhone/iPad fora do modo standalone e mostra a instrução manual
// (Compartilhar → Adicionar à Tela de Início), que é o único jeito de
// instalar lá. Mesma detecção serve pro aviso de push da Tarefa 3 (iOS só
// recebe push depois de instalado).
export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [visivel, setVisivel] = useState(false);
  const [modoIOS, setModoIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('nrc_pwa_ok')) return;
    if (isStandalone()) return; // já instalado, nada a mostrar

    if (isIOS()) {
      setModoIOS(true);
      setVisivel(true);
      return;
    }

    const handler = (e) => { e.preventDefault(); setPrompt(e); setVisivel(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function instalar() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') localStorage.setItem('nrc_pwa_ok', '1');
    setVisivel(false);
  }

  function dispensar() {
    localStorage.setItem('nrc_pwa_ok', '1');
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div
      className="fixed z-50 left-3 right-3 md:left-auto md:right-4 md:w-80"
      style={{ bottom: 'calc(56px + 12px)' }}
    >
      <div
        className="card flex items-center gap-3 shadow-2xl"
        style={{ border: '1px solid rgba(var(--accent-rgb), 0.35)', padding: '14px 16px' }}
      >
        <div
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded"
          style={{ background: 'rgba(var(--accent-rgb), 0.12)' }}
        >
          <img src="/favicon.svg" className="w-7 h-7" alt="" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>
            Instalar o NRC
          </p>
          {modoIOS ? (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Toque em <i className="ti ti-square-arrow-up" aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Compartilhar e depois em "Adicionar à Tela de Início"
            </p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Acesse direto da tela inicial</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={dispensar}
            className="w-8 h-8 flex items-center justify-center text-lg"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Fechar"
          >
            ×
          </button>
          {!modoIOS && (
            <button
              onClick={instalar}
              className="btn-primary text-xs px-3"
              style={{ minHeight: '34px' }}
            >
              Instalar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
