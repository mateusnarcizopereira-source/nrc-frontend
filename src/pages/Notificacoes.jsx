import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { pedirPermissaoEObterToken, pushConfigurado } from '../services/firebaseClient';
import { isIOS, isStandalone } from '../components/InstallBanner';

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

// Linguagem 100% leiga — nada de "PWA", "service worker", "token", "FCM".
// Passos literais pedidos: instalar primeiro (só assim funciona no iPhone),
// depois abrir pelo ícone novo e ativar lá dentro.
const PASSOS = {
  ios: [
    'Abrir o CRM no Safari (no Chrome do iPhone não funciona)',
    'Tocar no botão de compartilhar (quadrado com seta pra cima)',
    'Escolher "Adicionar à Tela de Início"',
    'Abrir o CRM pelo ícone novo que apareceu no celular',
    'Tocar em "Ativar notificações" e permitir',
  ],
  android: [
    'Abrir o CRM no Chrome',
    'Tocar no menu de três pontinhos',
    'Escolher "Instalar aplicativo" ou "Adicionar à tela inicial"',
    'Abrir pelo ícone novo',
    'Tocar em "Ativar notificações" e permitir',
  ],
};

const STATUS_CONFIG = {
  ativo: { label: 'Notificações ativas neste aparelho', cor: 'var(--success)', corRgb: 'var(--success-rgb)', icon: 'circle-check' },
  desativado: { label: 'Notificações desativadas', cor: 'var(--text-muted)', corRgb: '138, 138, 147', icon: 'bell-off' },
  bloqueado: { label: 'Permissão bloqueada no navegador', cor: 'var(--amber)', corRgb: 'var(--amber-rgb)', icon: 'lock' },
  verificando: { label: 'Verificando este aparelho…', cor: 'var(--text-muted)', corRgb: '138, 138, 147', icon: 'loader-2' },
};

export default function Notificacoes() {
  const [status, setStatus] = useState('verificando');
  const [sistema, setSistema] = useState('android'); // destaque inicial — trocado no mount conforme detecção
  const [ativando, setAtivando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [mensagem, setMensagem] = useState(null); // { tipo: 'sucesso'|'erro', texto }

  const iosSemInstalar = isIOS() && !isStandalone();

  // Verifica o estado real deste aparelho — sem NUNCA disparar o diálogo de
  // permissão sozinho (só quando permission já é 'granted', reconfirmar não
  // abre diálogo nenhum, é seguro chamar em background).
  const verificarStatus = useCallback(async () => {
    if (!('Notification' in window) || !pushConfigurado()) { setStatus('desativado'); return; }
    const permissao = Notification.permission;
    if (permissao === 'denied') { setStatus('bloqueado'); return; }
    if (permissao !== 'granted') { setStatus('desativado'); return; }

    try {
      const token = await pedirPermissaoEObterToken();
      if (token) {
        setStatus('ativo');
        api.post('/usuarios/me/fcm-token', { token }).catch(() => {}); // garante que está salvo, idempotente
      } else {
        setStatus('desativado');
      }
    } catch {
      setStatus('desativado');
    }
  }, []);

  useEffect(() => {
    setSistema(isIOS() ? 'ios' : 'android');
    verificarStatus();
  }, [verificarStatus]);

  async function ativarNotificacoes() {
    setAtivando(true);
    setMensagem(null);
    try {
      const token = await pedirPermissaoEObterToken();
      if (!token) {
        setStatus(Notification.permission === 'denied' ? 'bloqueado' : 'desativado');
        setMensagem({ tipo: 'erro', texto: 'Não deu pra ativar. Confirme se você permitiu quando o navegador perguntou.' });
        setAtivando(false);
        return;
      }
      await api.post('/usuarios/me/fcm-token', { token });
      setStatus('ativo');
      setMensagem({ tipo: 'sucesso', texto: 'Pronto! Notificações ativadas neste aparelho.' });
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Algo deu errado. Tente de novo.' });
    }
    setAtivando(false);
  }

  async function enviarTeste() {
    setTestando(true);
    setMensagem(null);
    try {
      const r = await api.post('/usuarios/me/notificacao-teste');
      if (r.data.enviados > 0) {
        setMensagem({ tipo: 'sucesso', texto: 'Notificação de teste enviada — deve aparecer no seu aparelho em instantes.' });
      } else {
        // Chamada foi aceita, mas nenhum dispositivo confirmou entrega —
        // token velho/inválido. Reativar de novo resolve (gera um token novo).
        setMensagem({ tipo: 'erro', texto: 'Não conseguimos confirmar a entrega. Tente desativar e ativar de novo nas configurações de notificação do aparelho.' });
      }
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e.response?.data?.erro || 'Não foi possível enviar a notificação de teste.' });
    }
    setTestando(false);
  }

  const c = STATUS_CONFIG[status];
  const passos = PASSOS[sistema];

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Notificações</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Ative para saber na hora quando você receber um lead novo.
        </p>
      </div>

      {/* ── Status atual — bem visível ─────────────────────── */}
      <div className="card flex items-center gap-3.5" style={{ borderColor: `rgba(${c.corRgb}, 0.35)` }}>
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `rgba(${c.corRgb}, 0.14)` }}
        >
          <i
            className={`ti ti-${c.icon} text-[22px] ${status === 'verificando' ? 'animate-spin' : ''}`}
            style={{ color: c.cor }}
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="font-semibold" style={{ color: c.cor }}>{c.label}</p>
          {status === 'bloqueado' && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Você negou a permissão antes. Precisa liberar manualmente nas configurações.
            </p>
          )}
        </div>
      </div>

      {/* ── Já ativo: oferece teste ─────────────────────────── */}
      {status === 'ativo' && (
        <div className="card-sm flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Quer ter certeza que está chegando certinho?
          </p>
          <button onClick={enviarTeste} disabled={testando} className="btn-secondary flex-shrink-0">
            <i className="ti ti-send text-[15px]" aria-hidden="true" />
            {testando ? 'Enviando…' : 'Enviar notificação de teste'}
          </button>
        </div>
      )}

      {mensagem && (
        <div
          className="card-sm text-sm"
          style={{
            color: mensagem.tipo === 'sucesso' ? 'var(--success)' : 'var(--accent)',
            borderColor: mensagem.tipo === 'sucesso' ? 'rgba(var(--success-rgb), 0.3)' : 'rgba(var(--accent-rgb), 0.3)',
          }}
        >
          {mensagem.texto}
        </div>
      )}

      {/* ── Escolha do sistema ──────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-faint)' }}>
          Qual é o seu celular?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <BotaoSistema
            ativo={sistema === 'ios'}
            destacado={isIOS()}
            icon="brand-apple"
            label="Tenho iPhone"
            onClick={() => setSistema('ios')}
          />
          <BotaoSistema
            ativo={sistema === 'android'}
            destacado={!isIOS()}
            icon="brand-android"
            label="Tenho Android"
            onClick={() => setSistema('android')}
          />
        </div>
      </div>

      {/* ── Passo a passo ───────────────────────────────────── */}
      <div className="card-sm">
        <ol className="space-y-3">
          {passos.map((texto, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(var(--accent-rgb), 0.10)', color: 'var(--accent)' }}
              >
                {i + 1}
              </span>
              <span className="text-sm pt-0.5" style={{ color: 'var(--text-secondary)' }}>{texto}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── CTA final — depende do estado atual ─────────────── */}
      {status !== 'ativo' && (
        <>
          {status === 'bloqueado' ? (
            <div className="card-sm text-sm" style={{ background: 'rgba(var(--amber-rgb), 0.08)', borderColor: 'rgba(var(--amber-rgb), 0.3)', color: 'var(--text-secondary)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--amber)' }}>
                <i className="ti ti-alert-triangle text-[15px]" aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Como liberar
              </p>
              {sistema === 'ios' ? (
                <p>Ajustes do iPhone → Safari (ou o ícone do CRM, se já instalado) → Notificações → Permitir. Depois volte aqui.</p>
              ) : (
                <p>Toque no cadeado (ou nos três pontinhos) ao lado do endereço → Permissões do site → Notificações → Permitir. Depois volte aqui.</p>
              )}
            </div>
          ) : sistema === 'ios' && iosSemInstalar ? (
            <div className="card-sm text-sm" style={{ background: 'rgba(var(--amber-rgb), 0.08)', borderColor: 'rgba(var(--amber-rgb), 0.3)', color: 'var(--text-secondary)' }}>
              <p className="font-semibold" style={{ color: 'var(--amber)' }}>
                <i className="ti ti-alert-triangle text-[15px]" aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Sem instalar, não funciona
              </p>
              <p className="mt-1">No iPhone, notificação só chega depois de adicionar o CRM na Tela de Início (passos 1 a 4 acima). Siga eles primeiro, depois volte nesta tela pelo ícone novo.</p>
            </div>
          ) : (
            <button onClick={ativarNotificacoes} disabled={ativando} className="btn-primary w-full">
              <i className="ti ti-bell-ringing text-[16px]" aria-hidden="true" />
              {ativando ? 'Ativando…' : 'Ativar notificações'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function BotaoSistema({ ativo, destacado, icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 py-5 transition-colors"
      style={{
        borderRadius: '4px',
        border: `1.5px solid ${ativo ? 'var(--accent)' : 'var(--border-color)'}`,
        background: ativo ? 'rgba(var(--accent-rgb), 0.06)' : 'var(--surface)',
        color: ativo ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {destacado && (
        <span
          className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
          style={{ background: ativo ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.08)', color: ativo ? '#fff' : 'var(--text-muted)' }}
        >
          seu aparelho
        </span>
      )}
      <i className={`ti ti-${icon} text-[26px]`} aria-hidden="true" />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
