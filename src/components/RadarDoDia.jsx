import { useState } from 'react';
import api from '../services/api';
import { montarRelatorio, construtorasDoRelatorio, dataComPontos } from '../utils/radarDoDia';

// GOD Painel (só editor): leads que chegaram por construtora. Só consulta quando o card é aberto, a data muda ou o botão
// "Atualizar" é clicado — nunca em laço nem por tempo. Mostra só contagens (nenhum dado de cliente).
function Tabela({ dados }) {
  if (!dados) return null;
  return (
    <div className="space-y-1.5">
      {dados.porConstrutora.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhum lead neste dia.</p>
      )}
      {dados.porConstrutora.map((c) => (
        <div key={c.construtora} className="flex items-center justify-between text-sm" style={{ color: 'var(--text)' }}>
          <span>{c.construtora}</span><b>{c.leads}</b>
        </div>
      ))}
      <div className="flex items-center justify-between text-sm pt-1.5" style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.08)', color: 'var(--text)' }}>
        <span className="font-semibold">Total do dia</span><b>{dados.total}</b>
      </div>
    </div>
  );
}

async function copiarTexto(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { /* cai no plano B */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export default function RadarDoDia() {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState('');

  // secoes: 'hoje,dia' (abrir), 'hoje' (Atualizar) ou 'dia' (trocar a data) — cada uma lê só o que precisa.
  async function carregar(secoes, data) {
    setCarregando(true); setErro('');
    try {
      const r = (await api.get('/god/radar-do-dia', { params: { secoes, ...(data ? { data } : {}) } })).data;
      setDados((antes) => ({ ...(antes || {}), ...r }));
    } catch (e) { setErro(e.response?.data?.erro || 'Não foi possível carregar o Radar do dia.'); }
    setCarregando(false);
  }

  function alternar() {
    const abrir = !aberto;
    setAberto(abrir);
    if (abrir) carregar('hoje,dia', dados?.dia?.data);
  }

  async function copiar() {
    const ok = await copiarTexto(montarRelatorio(dados.dia.data, dados.dia.porConstrutora));
    setCopiado(ok ? 'Relatório copiado!' : 'Não foi possível copiar.');
    setTimeout(() => setCopiado(''), 2500);
  }

  const semConstrutoras = dados?.dia && construtorasDoRelatorio(dados.dia.porConstrutora).length === 0;

  return (
    <div className="card space-y-3">
      <button onClick={alternar} className="w-full flex items-center justify-between text-left">
        <h2 className="font-bold" style={{ color: 'var(--text)' }}>Radar do dia</h2>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{aberto ? 'Recolher' : 'Abrir'}</span>
      </button>

      {aberto && (
        <div className="space-y-5">
          {erro && <p className="text-xs" style={{ color: 'var(--accent-hover)' }}>{erro}</p>}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Hoje {dados?.hoje && <span className="font-normal text-xs" style={{ color: 'var(--warning)' }}>· parcial, até {dados.hoje.parcialAte} (o dia ainda está em andamento)</span>}
              </p>
              <button onClick={() => carregar('hoje')} disabled={carregando} className="text-xs px-3 py-1.5 rounded font-medium"
                style={{ background: 'var(--accent)', color: '#fff', opacity: carregando ? 0.6 : 1 }}>
                {carregando ? 'Carregando…' : 'Atualizar'}
              </button>
            </div>
            <Tabela dados={dados?.hoje} />
          </section>

          <section className="space-y-2" style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.08)', paddingTop: '1rem' }}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Dia fechado {dados?.dia && <span className="font-normal text-xs" style={{ color: 'var(--text-tertiary)' }}>· {dataComPontos(dados.dia.data)}</span>}
              </p>
              <div className="flex items-center gap-2">
                {dados?.ultimoFechado && (
                  <input type="date" value={dados.dia?.data || dados.ultimoFechado} max={dados.ultimoFechado} disabled={carregando}
                    onChange={(e) => e.target.value && e.target.value <= dados.ultimoFechado && carregar('dia', e.target.value)}
                    className="text-xs px-2 py-1 rounded" style={{ border: '1px solid rgba(var(--ink-rgb), 0.15)', background: 'transparent', color: 'var(--text)' }} />
                )}
                <button onClick={copiar} disabled={!dados?.dia || semConstrutoras || carregando} className="text-xs px-3 py-1.5 rounded font-medium"
                  style={{ background: 'var(--accent)', color: '#fff', opacity: !dados?.dia || semConstrutoras || carregando ? 0.5 : 1 }}>
                  Copiar relatório
                </button>
              </div>
            </div>
            {copiado && <p className="text-xs" style={{ color: 'var(--success)' }}>{copiado}</p>}
            <Tabela dados={dados?.dia} />
          </section>
        </div>
      )}
    </div>
  );
}
