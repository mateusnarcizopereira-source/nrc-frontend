import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RESULTADOS = [
  { key: 'nao_atendeu',    label: 'Não atendeu',   icon: 'phone-off',      color: '#6B6B78' },
  { key: 'sem_interesse',  label: 'Sem interesse',  icon: 'thumb-down',     color: '#E74C3C' },
  { key: 'interessado',    label: 'Interessado',    icon: 'star',           color: '#F39C12' },
  { key: 'agendou_visita', label: 'Agendou visita', icon: 'calendar-check', color: '#27AE60' },
  { key: 'pulado',         label: 'Pular',          icon: 'chevron-right',  color: '#3A3A42' },
];

export default function CampanhaDiscador() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campanha, setCampanha] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [comentario, setComentario] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await api.get(`/campanhas/${id}`);
      setCampanha(r.data);
    } catch { navigate('/campanhas', { replace: true }); }
    setCarregando(false);
  }, [id, navigate]);

  useEffect(() => { carregar(); }, [carregar]);

  async function registrar(resultado) {
    if (salvando) return;
    setSalvando(true);
    try {
      const r = await api.post(`/campanhas/${id}/resultado`, {
        contatoIndex: campanha.posicaoAtual,
        resultado,
        comentario,
      });
      setComentario('');
      setCampanha(r.data);
    } catch {}
    setSalvando(false);
  }

  async function togglePausa() {
    try {
      const url = campanha.status === 'pausada'
        ? `/campanhas/${id}/retomar`
        : `/campanhas/${id}/pausar`;
      const r = await api.post(url);
      setCampanha(r.data);
    } catch {}
  }

  async function encerrar() {
    if (!window.confirm('Encerrar esta campanha?')) return;
    const r = await api.post(`/campanhas/${id}/encerrar`);
    setCampanha(r.data);
  }

  if (carregando) return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-2 border-nrc-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!campanha) return null;

  const total    = campanha.contatos?.length || 0;
  const pos      = campanha.posicaoAtual || 0;
  const pct      = total > 0 ? Math.round((pos / total) * 100) : 0;
  const atual    = campanha.contatos?.[pos];
  const encerrada = campanha.status === 'encerrada' || pos >= total;

  const stats = (campanha.contatos || []).reduce((acc, c) => {
    if (c.resultado) acc[c.resultado] = (acc[c.resultado] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/campanhas')}
            className="flex items-center gap-1 text-xs mb-1" style={{ color: '#3A3A42' }}>
            <i className="ti ti-arrow-left" />Campanhas
          </button>
          <h1 className="text-lg font-bold leading-tight" style={{ color: '#F4F4F8' }}>{campanha.nome}</h1>
        </div>
        {!encerrada && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={togglePausa}
              className="text-xs px-2.5 py-1.5 rounded font-medium"
              style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
              <i className={`ti ti-${campanha.status === 'pausada' ? 'player-play' : 'player-pause'} mr-1`} />
              {campanha.status === 'pausada' ? 'Retomar' : 'Pausar'}
            </button>
            <button onClick={encerrar}
              className="text-xs px-2.5 py-1.5 rounded"
              style={{ background: 'rgba(192,57,43,0.1)', color: '#E74C3C' }}>
              <i className="ti ti-square" />
            </button>
          </div>
        )}
      </div>

      {/* Barra de progresso */}
      <div>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: '#3A3A42' }}>
          <span>{pos} de {total} contatos</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'rgba(244,244,248,0.08)' }}>
          <div className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: encerrada ? '#3A3A42' : '#C0392B' }} />
        </div>
      </div>

      {/* ── ENCERRADA — Resumo ── */}
      {encerrada && (
        <div className="rounded-xl p-5 space-y-4"
          style={{ background: 'rgba(244,244,248,0.04)', border: '1px solid rgba(244,244,248,0.06)' }}>
          <div className="text-center">
            <i className="ti ti-check-circle text-3xl block mb-1" style={{ color: '#27AE60' }} />
            <p className="font-bold" style={{ color: '#F4F4F8' }}>Campanha encerrada</p>
            <p className="text-xs mt-0.5" style={{ color: '#3A3A42' }}>
              {campanha.totalContatados} contatados · {campanha.totalPulados} pulados
            </p>
          </div>

          <div className="space-y-2">
            {RESULTADOS.filter((r) => r.key !== 'pulado').map(({ key, label, icon, color }) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <i className={`ti ti-${icon}`} style={{ color }} />
                  <span style={{ color: '#F4F4F8' }}>{label}</span>
                </div>
                <span className="font-bold" style={{ color }}>{stats[key] || 0}</span>
              </div>
            ))}
          </div>

          {campanha.objetivo && (
            <div className="pt-2" style={{ borderTop: '1px solid rgba(244,244,248,0.06)' }}>
              <p className="text-xs mb-1" style={{ color: '#3A3A42' }}>Roteiro usado:</p>
              <p className="text-sm" style={{ color: '#6B6B78' }}>{campanha.objetivo}</p>
            </div>
          )}
        </div>
      )}

      {/* ── PAUSADA ── */}
      {!encerrada && campanha.status === 'pausada' && (
        <div className="rounded-xl p-8 text-center space-y-3"
          style={{ background: 'rgba(244,244,248,0.03)', border: '1px solid rgba(244,244,248,0.06)' }}>
          <i className="ti ti-player-pause text-3xl block" style={{ color: '#E67E22' }} />
          <p style={{ color: '#F4F4F8' }}>Campanha pausada</p>
          <button onClick={togglePausa}
            className="text-sm px-6 py-2 rounded font-medium"
            style={{ background: '#C0392B', color: '#fff' }}>
            Retomar
          </button>
        </div>
      )}

      {/* ── EM ANDAMENTO — Contato atual ── */}
      {!encerrada && campanha.status !== 'pausada' && atual && (
        <div className="space-y-4">
          {/* Card do contato */}
          <div className="rounded-xl p-5 space-y-3"
            style={{ background: 'rgba(244,244,248,0.04)', border: '1px solid rgba(244,244,248,0.06)' }}>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(192,57,43,0.12)', color: '#E74C3C' }}>
              #{pos + 1} de {total}
            </span>
            <h2 className="text-xl font-bold" style={{ color: '#F4F4F8' }}>{atual.nome}</h2>
            <a href={`tel:${atual.telefone}`}
              className="flex items-center gap-2 text-base font-semibold"
              style={{ color: '#27AE60' }}>
              <i className="ti ti-phone" />{atual.telefone}
            </a>
            {atual.empreendimentoInteresse && (
              <p className="text-sm" style={{ color: '#3A3A42' }}>
                <i className="ti ti-building mr-1" />{atual.empreendimentoInteresse}
              </p>
            )}
            {campanha.objetivo && (
              <div className="px-3 py-2 rounded text-xs"
                style={{ background: 'rgba(244,244,248,0.04)', border: '1px solid rgba(244,244,248,0.05)', color: '#6B6B78' }}>
                {campanha.objetivo}
              </div>
            )}
          </div>

          {/* Anotação */}
          <div>
            <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Anotação (opcional)</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="Ex.: demonstrou interesse em 2 quartos…"
              className="w-full text-sm px-3 py-2 rounded outline-none resize-none"
              style={{ background: 'rgba(244,244,248,0.05)', color: '#F4F4F8', border: '1px solid rgba(244,244,248,0.08)' }}
            />
          </div>

          {/* Botões de resultado */}
          <div className="grid grid-cols-2 gap-2">
            {RESULTADOS.map(({ key, label, icon, color }) => (
              <button
                key={key}
                onClick={() => registrar(key)}
                disabled={salvando}
                className="flex items-center gap-2 px-3 py-3.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: `${color}18`,
                  border: `1px solid ${color}40`,
                  color,
                  opacity: salvando ? 0.6 : 1,
                  gridColumn: key === 'pulado' ? 'span 2' : undefined,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${color}30`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `${color}18`; }}
              >
                <i className={`ti ti-${icon} text-base`} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
