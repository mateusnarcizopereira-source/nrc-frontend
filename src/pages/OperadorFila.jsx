import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

function iniciais(nome) {
  return nome?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?';
}
function fmtHora(iso) {
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
}

const INTERVALO_MS = 30000;

export default function OperadorFila() {
  const { usuario } = useAuth();
  const podeRemover = ['gerente', 'editor'].includes(usuario?.perfil);

  const [dados, setDados] = useState(null); // { presentes, ausentes }
  const [carregando, setCarregando] = useState(true);
  const [removendo, setRemovendo] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const r = await api.get('/sorteio/fila-viva');
      setDados(r.data);
      setErro('');
    } catch {
      setErro('Erro ao carregar a fila.');
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [carregar]);

  async function remover(corretorId, nome) {
    if (!window.confirm(`Remover ${nome} da fila?`)) return;
    setRemovendo(corretorId);
    try {
      await api.post('/sorteio/remover-da-fila', { corretorId });
      await carregar();
    } catch {
      setErro('Erro ao remover da fila.');
    }
    setRemovendo(null);
  }

  const presentes = dados?.presentes || [];
  const ausentes = dados?.ausentes || [];

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Fila</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Corretores presentes agora, em ordem de quem recebe o próximo lead
          </p>
        </div>
        <button onClick={carregar} className="btn-secondary text-sm flex-shrink-0">
          <i className="ti ti-refresh text-[16px]" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {erro && (
        <div className="text-sm px-4 py-3" style={{
          background: 'rgba(var(--accent-rgb), 0.08)', border: '1px solid rgba(var(--accent-rgb), 0.2)',
          color: 'var(--accent-hover)', borderRadius: '2px',
        }}>
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Presentes */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <i className="ti ti-user-check text-[16px]" style={{ color: 'var(--success)' }} aria-hidden="true" />
                Presentes
                <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({presentes.length})</span>
              </h2>
            </div>

            {presentes.length === 0 ? (
              <div className="text-center py-10 px-5">
                <i className="ti ti-user-off text-[32px]" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Nenhum corretor presente agora.</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                  Leads novos ficam aguardando na fila de espera até alguém marcar presença.
                </p>
              </div>
            ) : (
              <div>
                {presentes.map((c) => (
                  <div key={c.corretorId} className="flex items-center gap-3 px-5 py-3.5 transition-colors" style={{
                    minHeight: '64px', borderBottom: '1px solid var(--border-color)',
                    background: c.proximo ? 'rgba(var(--accent-rgb), 0.06)' : 'transparent',
                  }}>
                    <div className="flex-shrink-0 flex items-center justify-center rounded-full font-bold"
                      style={c.proximo
                        ? { width: '44px', height: '44px', fontSize: '14px', background: 'var(--accent)', color: '#fff', boxShadow: '0 0 0 4px rgba(var(--accent-rgb), 0.2)' }
                        : { width: '36px', height: '36px', fontSize: '12px', background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                      {iniciais(c.corretorNome)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate" style={{ color: c.proximo ? 'var(--text)' : 'var(--text-secondary)', fontSize: c.proximo ? '15px' : '14px' }}>
                          {c.corretorNome}
                        </p>
                        {c.proximo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: 'var(--accent)', color: '#fff' }}>
                            Próximo
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: c.proximo ? 'var(--accent)' : 'var(--text-faint)' }}>
                        Entrou às {fmtHora(c.horaCheckIn)} · {c.leadsHoje} lead{c.leadsHoje === 1 ? '' : 's'} hoje
                      </p>
                    </div>

                    {c.proximo ? (
                      <span className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--accent)' }} />
                    ) : podeRemover ? (
                      <button
                        onClick={() => remover(c.corretorId, c.corretorNome)}
                        disabled={removendo === c.corretorId}
                        title="Remover da fila"
                        className="p-1.5 rounded flex-shrink-0 transition-colors"
                        style={{ color: 'var(--text-faint)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                      >
                        {removendo === c.corretorId
                          ? <i className="ti ti-loader-2 animate-spin text-[16px]" aria-hidden="true" />
                          : <i className="ti ti-x text-[16px]" aria-hidden="true" />}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ausentes */}
          {ausentes.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                <i className="ti ti-user-off text-[16px]" aria-hidden="true" />
                Ausentes
                <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({ausentes.length})</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {ausentes.map((c) => (
                  <span key={c.corretorId}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-faint)', border: '1px solid var(--border-color)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-faint)' }} />
                    {c.corretorNome}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
