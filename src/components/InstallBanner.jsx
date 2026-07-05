import { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('nrc_pwa_ok')) return;
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
        style={{ border: '1px solid rgba(192,57,43,0.35)', padding: '14px 16px' }}
      >
        <div
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded"
          style={{ background: 'rgba(192,57,43,0.12)' }}
        >
          <img src="/favicon.svg" className="w-7 h-7" alt="" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: '#F4F4F8' }}>
            Instalar o NRC
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#4A4A52' }}>Acesse direto da tela inicial</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={dispensar}
            className="w-8 h-8 flex items-center justify-center text-lg"
            style={{ color: '#3A3A42' }}
            aria-label="Fechar"
          >
            ×
          </button>
          <button
            onClick={instalar}
            className="btn-primary text-xs px-3"
            style={{ minHeight: '34px' }}
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
