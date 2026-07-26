import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificacoes } from '../contexts/NotificacoesContext';

const ICONE = {
  lead_novo:       'user-plus',
  sorteio:         'ticket',
  tarefa_vencendo: 'clock-exclamation',
  tarefa_atrasada: 'alarm',
  info:            'bell',
};

function fmt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function SinoNotificacoes({ painelStyle }) {
  const { lista, naoLidas, somLigado, setSomLigado, marcarLida, marcarTodas } = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  function abrir(n) {
    if (!n.lida) marcarLida(n.id);
    setAberto(false);
    if (n.link) navigate(n.link);
  }

  return (
    <>
      <button onClick={() => setAberto((v) => !v)} className="relative p-1.5" aria-label="Notificações"
        style={{ color: aberto ? '#F4F4F8' : '#6A6A70' }}>
        <i className="ti ti-bell text-[20px]" aria-hidden="true" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold rounded-full flex items-center justify-center"
            style={{ background: '#C0392B', color: '#fff', minWidth: '15px', height: '15px', padding: '0 3px' }}>
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="fixed z-50 rounded-xl shadow-2xl overflow-hidden"
            style={{
              width: '20rem', maxWidth: '90vw', maxHeight: '70vh',
              background: '#0D0D0F', border: '1px solid rgba(244,244,248,0.10)',
              display: 'flex', flexDirection: 'column',
              ...painelStyle,
            }}>
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(244,244,248,0.06)' }}>
              <span className="font-semibold text-sm" style={{ color: '#F4F4F8' }}>Notificações</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setSomLigado(!somLigado)} title={somLigado ? 'Som ligado' : 'Som desligado'}
                  className="p-1.5" style={{ color: somLigado ? '#6A6A70' : '#3A3A42' }}>
                  <i className={`ti ti-${somLigado ? 'volume' : 'volume-off'} text-[16px]`} aria-hidden="true" />
                </button>
                {naoLidas > 0 && (
                  <button onClick={marcarTodas} className="text-[11px] px-2 py-1" style={{ color: '#C0392B' }}>
                    Marcar todas
                  </button>
                )}
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto">
              {lista.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: '#3A3A42' }}>Nenhuma notificação.</p>
              ) : (
                lista.map((n) => (
                  <button key={n.id} onClick={() => abrir(n)}
                    className="w-full text-left flex gap-3 px-4 py-3 transition-colors"
                    style={{ borderBottom: '1px solid rgba(244,244,248,0.04)', background: n.lida ? 'transparent' : 'rgba(192,57,43,0.05)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,244,248,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = n.lida ? 'transparent' : 'rgba(192,57,43,0.05)')}>
                    <i className={`ti ti-${ICONE[n.tipo] || 'bell'} text-[18px] mt-0.5 flex-shrink-0`}
                      style={{ color: n.lida ? '#4A4A52' : '#E74C3C' }} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: '#F4F4F8' }}>{n.titulo}</p>
                        <span className="text-[10px] flex-shrink-0" style={{ color: '#3A3A42' }}>{fmt(n.criadoEm)}</span>
                      </div>
                      {n.mensagem && <p className="text-xs mt-0.5 truncate" style={{ color: '#6A6A70' }}>{n.mensagem}</p>}
                    </div>
                    {!n.lida && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#C0392B' }} />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
