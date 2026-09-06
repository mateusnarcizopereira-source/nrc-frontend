import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Avatar from '../components/Avatar';
import { dentroDaJanelaCheckin, checkinAindaNaoAbriu } from '../utils/janelaFila';

function fmtHora(iso) {
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
}

const INTERVALO_MS = 30000;

// Mudança de conceito: a fila deixou de ser "ao vivo" e virou ponto de
// presença com janela fechada (check-in 09:00-09:59, sorteio às 10:00,
// ordem vale o dia todo). Esta tela mostra a ordem sorteada, quem é o
// próximo, leads recebidos hoje, e quem ficou de fora — com controles de
// incluir/mover só pra editor/GOD.
export default function OperadorFila() {
  const { usuario } = useAuth();
  const ehEditor = usuario?.perfil === 'editor';

  const [dados, setDados] = useState(null); // { sorteada, sorteadoEm, ordem, fora, aguardandoSorteio }
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null); // corretorId sendo incluído/movido

  const carregar = useCallback(async () => {
    try {
      const r = await api.get('/sorteio/fila-do-dia');
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

  async function incluir(corretorId) {
    setAcaoEmAndamento(corretorId);
    try {
      await api.post('/sorteio/incluir', { corretorId });
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao incluir na fila.');
    }
    setAcaoEmAndamento(null);
  }

  async function mover(corretorId, novaPosicao) {
    setAcaoEmAndamento(corretorId);
    try {
      await api.post('/sorteio/mover', { corretorId, novaPosicao });
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao mover na fila.');
    }
    setAcaoEmAndamento(null);
  }

  const ordem = dados?.ordem || [];
  const fora = dados?.fora || [];
  const aguardando = dados?.aguardandoSorteio || [];
  const sorteada = Boolean(dados?.sorteada);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Fila</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {sorteada
              ? 'Ordem sorteada às ' + fmtHora(dados.sorteadoEm) + ' — vale o dia todo'
              : 'Check-in 09:00-09:59 · sorteio às 10:00'}
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
      ) : sorteada ? (
        <>
          {/* Ordem sorteada do dia */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <i className="ti ti-list-numbers text-[16px]" style={{ color: 'var(--success)' }} aria-hidden="true" />
                Ordem de hoje
                <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({ordem.length})</span>
              </h2>
            </div>

            {ordem.length === 0 ? (
              <div className="text-center py-10 px-5">
                <i className="ti ti-user-off text-[32px]" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Ninguém bateu ponto hoje.</p>
                {ehEditor && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                    Inclua alguém na lista "Fora" abaixo pra a fila de hoje começar a receber leads.
                  </p>
                )}
              </div>
            ) : (
              <div>
                {ordem.map((c, i) => (
                  <div key={c.corretorId} className="flex items-center gap-3 px-5 py-3.5 transition-colors" style={{
                    minHeight: '64px', borderBottom: '1px solid var(--border-color)',
                    background: c.proximo ? 'rgba(var(--accent-rgb), 0.06)' : 'transparent',
                  }}>
                    <span className="text-xs font-semibold flex-shrink-0 w-5 text-center" style={{ color: 'var(--text-faint)' }}>
                      {i + 1}
                    </span>
                    <div className="flex-shrink-0 rounded-full" style={c.proximo ? { boxShadow: '0 0 0 3px var(--accent)' } : undefined}>
                      <Avatar nome={c.corretorNome} fotoBase64={c.fotoBase64} fotoTipo={c.fotoTipo} size={c.proximo ? 44 : 36} />
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
                        {c.leadsHoje} lead{c.leadsHoje === 1 ? '' : 's'} hoje
                      </p>
                    </div>

                    {ehEditor && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => mover(c.corretorId, i - 1)}
                          disabled={i === 0 || acaoEmAndamento === c.corretorId}
                          title="Mover pra cima"
                          className="w-7 h-7 flex items-center justify-center rounded transition-colors"
                          style={{ color: i === 0 ? 'var(--text-faint)' : 'var(--text-tertiary)', opacity: i === 0 ? 0.4 : 1 }}
                        >
                          <i className="ti ti-chevron-up text-[16px]" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => mover(c.corretorId, i + 1)}
                          disabled={i === ordem.length - 1 || acaoEmAndamento === c.corretorId}
                          title="Mover pra baixo"
                          className="w-7 h-7 flex items-center justify-center rounded transition-colors"
                          style={{ color: i === ordem.length - 1 ? 'var(--text-faint)' : 'var(--text-tertiary)', opacity: i === ordem.length - 1 ? 0.4 : 1 }}
                        >
                          <i className="ti ti-chevron-down text-[16px]" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        // Check-in ainda aberto (ou ainda não abriu) — sorteio não rodou.
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <i className={`ti ${dentroDaJanelaCheckin() ? 'ti-clock' : 'ti-lock'} text-[22px]`}
              style={{ color: dentroDaJanelaCheckin() ? 'var(--warning)' : 'var(--text-muted)' }} aria-hidden="true" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {checkinAindaNaoAbriu()
                ? 'Check-in ainda não abriu — abre às 09:00.'
                : dentroDaJanelaCheckin()
                  ? 'Check-in aberto até 09:59 — a fila fecha e é sorteada às 10:00.'
                  : 'Fechando o check-in e sorteando a fila do dia...'}
            </p>
          </div>
          {aguardando.length > 0 && (
            <>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                Já bateram ponto ({aguardando.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {aguardando.map((c) => (
                  <span key={c.corretorId}
                    className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)', border: '1px solid rgba(var(--success-rgb), 0.25)' }}>
                    <Avatar nome={c.corretorNome} size={18} />
                    {c.corretorNome} · {fmtHora(c.horaCheckIn)}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Fora da fila de hoje */}
      {!carregando && fora.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <i className="ti ti-user-off text-[16px]" aria-hidden="true" />
            Fora da fila de hoje
            <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({fora.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {fora.map((c) => (
              <span key={c.corretorId}
                className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-xs font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text-faint)', border: '1px solid var(--border-color)' }}>
                <Avatar nome={c.corretorNome} fotoBase64={c.fotoBase64} fotoTipo={c.fotoTipo} size={18} opaco />
                {c.corretorNome}
                {ehEditor && (
                  <button
                    onClick={() => incluir(c.corretorId)}
                    disabled={acaoEmAndamento === c.corretorId}
                    title="Incluir no fim da fila de hoje"
                    className="ml-1 w-5 h-5 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
                    style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)' }}
                  >
                    {acaoEmAndamento === c.corretorId
                      ? <i className="ti ti-loader-2 animate-spin text-[12px]" aria-hidden="true" />
                      : <i className="ti ti-plus text-[12px]" aria-hidden="true" />}
                  </button>
                )}
              </span>
            ))}
          </div>
          {ehEditor && (
            <p className="text-[11px] mt-2.5" style={{ color: 'var(--text-faint)' }}>
              Quem não bateu ponto até 09:59 fica de fora o dia todo — inclua manualmente se precisar. Entra no fim da fila.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
