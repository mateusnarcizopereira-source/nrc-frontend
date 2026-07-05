import { useState, useEffect } from 'react';
import { conectarSocket } from '../services/socket';
import api from '../services/api';

function iniciais(nome) {
  return nome?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?';
}

export default function OperadorFila() {
  const [fila, setFila] = useState(null);
  const [presencas, setPresencas] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    carregarDados();
    const socket = conectarSocket();
    socket.on('fila_atualizada', setFila);
    socket.on('sorteio_realizado', setFila);
    return () => { socket.off('fila_atualizada'); socket.off('sorteio_realizado'); };
  }, []);

  async function carregarDados() {
    const [filaRes, presRes] = await Promise.all([
      api.get('/sorteio/fila').catch(() => ({ data: null })),
      api.get('/sorteio/presencas').catch(() => ({ data: [] })),
    ]);
    setFila(filaRes.data?.ordem ? filaRes.data : null);
    setPresencas(presRes.data);
  }

  async function voltarNaVez(corretorId) {
    setLoading(corretorId);
    setFeedback(null);
    try {
      const res = await api.post('/sorteio/voltar-corretor', { corretorId });
      setFeedback({ tipo: 'ok', msg: res.data.mensagem });
      await carregarDados();
    } catch (e) {
      setFeedback({ tipo: 'erro', msg: e.response?.data?.erro || 'Erro ao atualizar fila.' });
    } finally {
      setLoading(null);
    }
  }

  const posicaoAtual = fila ? fila.posicaoAtual % fila.ordem.length : -1;

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>Fila de Distribuição</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6A6A70' }}>Sem acesso a dados de clientes</p>
      </div>

      {feedback && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium"
          style={{
            borderRadius: '2px',
            ...(feedback.tipo === 'ok'
              ? { background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', color: '#2ECC71' }
              : { background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', color: '#E74C3C' }),
          }}
        >
          <i className={`ti ${feedback.tipo === 'ok' ? 'ti-circle-check' : 'ti-circle-x'} text-[18px]`} aria-hidden="true" />
          {feedback.msg}
        </div>
      )}

      {/* Presentes */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <i className="ti ti-user-check text-[17px]" style={{ color: '#C0392B' }} aria-hidden="true" />
          <h2 className="font-semibold text-sm" style={{ color: '#F4F4F8' }}>
            Check-in hoje
            <span className="ml-1.5 font-normal" style={{ color: '#4A4A52' }}>({presencas.length})</span>
          </h2>
        </div>
        {presencas.length === 0 ? (
          <p className="text-sm" style={{ color: '#3A3A42' }}>Nenhum corretor fez check-in.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presencas.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(192,57,43,0.10)',
                  color: '#E74C3C',
                  border: '1px solid rgba(192,57,43,0.2)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C0392B' }} />
                {p.corretorNome}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fila — trilha vertical */}
      <div className="card p-0 overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(244,244,248,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <i className="ti ti-arrows-sort text-[17px]" style={{ color: '#3A3A42' }} aria-hidden="true" />
            <h2 className="font-semibold text-sm" style={{ color: '#F4F4F8' }}>Fila de distribuição</h2>
          </div>
          {fila && (
            <span
              className="text-[11px] font-medium capitalize px-2.5 py-1 rounded"
              style={{ color: '#4A4A52', background: '#141418' }}
            >
              {fila.periodo}
            </span>
          )}
        </div>

        {!fila ? (
          <div className="text-center py-10 px-5">
            <i className="ti ti-calendar-off text-[32px]" style={{ color: '#1E1E24' }} aria-hidden="true" />
            <p className="text-sm mt-2" style={{ color: '#3A3A42' }}>Nenhum sorteio ativo hoje.</p>
            <p className="text-xs mt-1" style={{ color: '#1E1E24' }}>
              Sorteios ocorrem automaticamente nos horários configurados.
            </p>
          </div>
        ) : (
          <div>
            {[...fila.ordem.slice(posicaoAtual), ...fila.ordem.slice(0, posicaoAtual)].map((c, i) => {
              const isProximo = i === 0;
              const posRelativa = i + 1;
              return (
                <div
                  key={c.corretorId}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                  style={{
                    minHeight: '64px',
                    borderBottom: '1px solid rgba(244,244,248,0.04)',
                    background: isProximo ? 'rgba(192,57,43,0.06)' : 'transparent',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full font-bold"
                    style={
                      isProximo
                        ? {
                            width: '44px', height: '44px', fontSize: '14px',
                            background: '#C0392B', color: '#fff',
                            boxShadow: '0 0 0 4px rgba(192,57,43,0.2)',
                          }
                        : {
                            width: '36px', height: '36px', fontSize: '12px',
                            background: '#141418', color: '#6A6A70',
                          }
                    }
                  >
                    {iniciais(c.corretorNome)}
                  </div>

                  {/* Nome + badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="font-semibold truncate"
                        style={{
                          color: isProximo ? '#F4F4F8' : '#A0A0A8',
                          fontSize: isProximo ? '15px' : '14px',
                        }}
                      >
                        {c.corretorNome}
                      </p>
                      {isProximo && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                          style={{ background: '#C0392B', color: '#fff' }}
                        >
                          Próximo
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs mt-0.5 font-medium"
                      style={{ color: isProximo ? '#C0392B' : '#2A2A30' }}
                    >
                      #{posRelativa} na fila
                    </p>
                  </div>

                  {/* Ação */}
                  {isProximo ? (
                    <span className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#C0392B' }} />
                  ) : (
                    <button
                      onClick={() => voltarNaVez(c.corretorId)}
                      disabled={loading === c.corretorId}
                      style={{
                        minHeight: '36px',
                        borderRadius: '2px',
                        border: '1px solid rgba(192,57,43,0.3)',
                        background: 'rgba(192,57,43,0.06)',
                        color: '#E74C3C',
                        fontSize: '12px',
                        padding: '0 12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontWeight: '600',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(192,57,43,0.14)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(192,57,43,0.06)')}
                    >
                      {loading === c.corretorId ? (
                        <span className="flex items-center gap-1">
                          <i className="ti ti-loader-2 animate-spin text-[14px]" aria-hidden="true" /> ...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <i className="ti ti-corner-down-left text-[14px]" aria-hidden="true" />
                          Voltar na vez
                        </span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button onClick={carregarDados} className="btn-secondary text-sm">
        <i className="ti ti-refresh text-[16px]" aria-hidden="true" />
        Atualizar
      </button>
    </div>
  );
}
