import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificacoes } from '../contexts/NotificacoesContext';
import { filtrarPorGrupo } from '../utils/notificacoes';

const ICONE = {
  lead_novo:       'user-plus',
  lead_repassado:  'arrows-exchange', // lead repassado por falta de atendimento (sem som)
  sorteio:         'ticket',
  tarefa_vencendo: 'clock-exclamation',
  tarefa_atrasada: 'alarm',
  lead_parado:     'snowflake',
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
  const { lista, naoLidas, naoLidasTotal, naoLidasOutras, somLigado, setSomLigado, marcarLida, marcarTodas } = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState('leads'); // 'leads' (lead novo/repassado) | 'outras'
  const visiveis = filtrarPorGrupo(lista, aba);
  const navigate = useNavigate();

  function abrir(n) {
    if (!n.lida) marcarLida(n.id);
    setAberto(false);
    if (n.link) navigate(n.link);
  }

  return (
    <>
      <button onClick={() => setAberto((v) => !v)} className="relative p-1.5" aria-label="Notificações"
        style={{ color: aberto ? 'var(--text)' : 'var(--text-tertiary)' }}>
        <i className="ti ti-bell text-[20px]" aria-hidden="true" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)', color: '#fff', minWidth: '15px', height: '15px', padding: '0 3px' }}>
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
              background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.10)',
              display: 'flex', flexDirection: 'column',
              ...painelStyle,
            }}>
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Notificações</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setSomLigado(!somLigado)} title={somLigado ? 'Som ligado' : 'Som desligado'}
                  className="p-1.5" style={{ color: somLigado ? 'var(--text-tertiary)' : 'var(--text-muted)' }}>
                  <i className={`ti ti-${somLigado ? 'volume' : 'volume-off'} text-[16px]`} aria-hidden="true" />
                </button>
                {naoLidasTotal > 0 && (
                  <button onClick={marcarTodas} className="text-[11px] px-2 py-1" style={{ color: 'var(--accent)' }}>
                    Marcar todas como lidas
                  </button>
                )}
              </div>
            </div>

            {/* Abas: o aviso de lead novo não se perde entre tarefas e alertas */}
            <div className="flex" style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
              {[['leads', 'Leads', naoLidas], ['outras', 'Outras', naoLidasOutras]].map(([chave, rotulo, qtd]) => (
                <button key={chave} onClick={() => setAba(chave)} className="flex-1 text-xs font-semibold py-2 flex items-center justify-center gap-1.5"
                  style={{ color: aba === chave ? 'var(--text)' : 'var(--text-muted)', borderBottom: aba === chave ? '2px solid var(--accent)' : '2px solid transparent' }}>
                  {rotulo}
                  {qtd > 0 && <span className="text-[10px] rounded-full px-1.5" style={{ background: chave === 'leads' ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.12)', color: chave === 'leads' ? '#fff' : 'var(--text-secondary)' }}>{qtd > 99 ? '99+' : qtd}</span>}
                </button>
              ))}
            </div>

            {/* Lista */}
            <div className="overflow-y-auto">
              {visiveis.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{aba === 'leads' ? 'Nenhum aviso de lead.' : 'Nenhuma outra notificação.'}</p>
              ) : (
                visiveis.map((n) => (
                  <button key={n.id} onClick={() => abrir(n)}
                    className="w-full text-left flex gap-3 px-4 py-3 transition-colors"
                    style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)', background: n.lida ? 'transparent' : 'rgba(var(--accent-rgb), 0.05)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = n.lida ? 'transparent' : 'rgba(var(--accent-rgb), 0.05)')}>
                    <i className={`ti ti-${ICONE[n.tipo] || 'bell'} text-[18px] mt-0.5 flex-shrink-0`}
                      style={{ color: n.lida ? 'var(--text-muted)' : 'var(--accent-hover)' }} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{n.titulo}</p>
                        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmt(n.criadoEm)}</span>
                      </div>
                      {n.mensagem && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{n.mensagem}</p>}
                    </div>
                    {!n.lida && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--accent)' }} />}
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
