import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { pedirPermissaoEObterToken, pushConfigurado } from '../services/firebaseClient';
import { isIOS, isStandalone } from './InstallBanner';

const CHAVE_VISTO = 'nrc_push_prompt_visto';

// Pede permissão de push de forma NÃO intrusiva (Tarefa 3): só corretor
// (só quem recebe leads), só depois de um respiro após o login, só uma vez
// — se fechar sem decidir ou se o navegador negar, nunca mais insiste
// (mesma sessão de navegador; local ao dispositivo, de propósito, já que
// cada aparelho tem seu próprio token e sua própria decisão de permissão).
export default function NotificacoesPushPrompt() {
  const { usuario } = useAuth();
  const [visivel, setVisivel] = useState(false);
  const [avisoIOS, setAvisoIOS] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!usuario || usuario.perfil !== 'corretor') return;
    if (localStorage.getItem(CHAVE_VISTO)) return;
    if (!pushConfigurado()) return; // Firebase ainda não configurado neste ambiente
    if (!('Notification' in window)) return;
    // Evita sobrepor o InstallBanner (mesma posição na tela) — só aparece
    // depois que a questão de instalar já foi resolvida de algum jeito
    // (aceitou, dispensou, ou já estava instalado).
    if (!isStandalone() && !localStorage.getItem('nrc_pwa_ok')) return;

    // iOS só recebe push depois de instalado (adicionado à Tela de Início
    // pelo Safari) — pedir permissão antes disso não funciona. Mostra a
    // instrução em vez do pedido; some sozinho depois de instalado (cai no
    // fluxo normal, isStandalone() passa a ser true).
    if (isIOS() && !isStandalone()) {
      setAvisoIOS(true);
      setVisivel(true);
      return;
    }

    if (Notification.permission !== 'default') return; // já decidiu antes (aceitou ou negou)

    const t = setTimeout(() => setVisivel(true), 4000); // respiro depois do login, não é o primeiro clique
    return () => clearTimeout(t);
  }, [usuario]);

  async function ativar() {
    setEnviando(true);
    try {
      const token = await pedirPermissaoEObterToken();
      if (token) {
        await api.post('/usuarios/me/fcm-token', { token });
      }
    } catch {
      // Silencioso de propósito — push é um extra, nunca deve virar um erro
      // visível pro corretor no meio do trabalho.
    }
    localStorage.setItem(CHAVE_VISTO, '1');
    setVisivel(false);
    setEnviando(false);
  }

  function dispensar() {
    localStorage.setItem(CHAVE_VISTO, '1');
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className="fixed z-50 left-3 right-3 md:left-auto md:right-4 md:w-80" style={{ bottom: 'calc(56px + 12px)' }}>
      <div className="card flex items-center gap-3 shadow-2xl" style={{ border: '1px solid var(--border-color)', padding: '14px 16px' }}>
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded" style={{ background: 'rgba(var(--blue-rgb), 0.12)' }}>
          <i className="ti ti-bell-ringing text-[20px]" style={{ color: 'var(--blue)' }} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>Notificações de lead novo</p>
          {avisoIOS ? (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              No iPhone, push só funciona depois de instalar o app (toque em Compartilhar → Adicionar à Tela de Início)
            </p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Saiba na hora quando receber um lead</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={dispensar} className="w-8 h-8 flex items-center justify-center text-lg" style={{ color: 'var(--text-muted)' }} aria-label="Fechar">×</button>
          {!avisoIOS && (
            <button onClick={ativar} disabled={enviando} className="btn-primary text-xs px-3" style={{ minHeight: '34px' }}>
              {enviando ? '...' : 'Ativar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
