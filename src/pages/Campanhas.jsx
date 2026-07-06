import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_LABEL = {
  em_andamento: { label: 'Em andamento', color: '#27AE60', bg: 'rgba(39,174,96,0.12)' },
  pausada:      { label: 'Pausada',      color: '#E67E22', bg: 'rgba(230,126,34,0.12)' },
  encerrada:    { label: 'Encerrada',    color: '#6B6B78', bg: 'rgba(58,58,66,0.3)' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || STATUS_LABEL.encerrada;
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function Campanhas() {
  const navigate = useNavigate();
  const [campanhas, setCampanhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNova, setModalNova] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api.get('/campanhas');
      setCampanhas(r.data);
    } catch {}
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F4F4F8' }}>Oferta Ativa</h1>
          <p className="text-xs mt-0.5" style={{ color: '#3A3A42' }}>Campanhas de discagem</p>
        </div>
        <button onClick={() => setModalNova(true)}
          className="text-sm px-3 py-1.5 rounded font-medium"
          style={{ background: '#C0392B', color: '#fff' }}>
          <i className="ti ti-plus mr-1.5" />Nova campanha
        </button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-nrc-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campanhas.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#3A3A42' }}>
          <i className="ti ti-phone-off text-4xl block mb-3" />
          <p className="text-sm">Nenhuma campanha ainda</p>
          <p className="text-xs mt-1">Crie uma campanha para iniciar o discador</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campanhas.map((c) => {
            const total = c.contatos?.length || 0;
            const feitos = c.posicaoAtual || 0;
            const pct = total > 0 ? Math.round((feitos / total) * 100) : 0;

            return (
              <div key={c.id}
                className="px-4 py-3 rounded-lg"
                style={{ background: 'rgba(244,244,248,0.04)', border: '1px solid rgba(244,244,248,0.06)' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: '#F4F4F8' }}>{c.nome}</p>
                    {c.objetivo && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#3A3A42' }}>{c.objetivo}</p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {/* Barra progresso */}
                <div className="mb-2">
                  <div className="flex justify-between text-[11px] mb-1" style={{ color: '#3A3A42' }}>
                    <span>{feitos} de {total} contatos</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'rgba(244,244,248,0.08)' }}>
                    <div className="h-1 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: c.status === 'encerrada' ? '#3A3A42' : '#C0392B' }} />
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  {c.status !== 'encerrada' && (
                    <button
                      onClick={() => navigate(`/campanhas/${c.id}/discador`)}
                      className="flex-1 text-xs py-1.5 rounded font-medium"
                      style={{ background: '#C0392B', color: '#fff' }}>
                      {c.status === 'pausada' ? 'Retomar' : 'Abrir discador'}
                    </button>
                  )}
                  {c.status === 'encerrada' && (
                    <button
                      onClick={() => navigate(`/campanhas/${c.id}/discador`)}
                      className="flex-1 text-xs py-1.5 rounded font-medium"
                      style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
                      Ver resumo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalNova && (
        <NovaCampanhaModal onClose={() => setModalNova(false)} onCriada={(id) => { setModalNova(false); navigate(`/campanhas/${id}/discador`); }} />
      )}
    </div>
  );
}

function NovaCampanhaModal({ onClose, onCriada }) {
  const [nome, setNome] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [clientes, setClientes] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCarregando(true);
    api.get('/clientes').then((r) => { setClientes(r.data); setCarregando(false); }).catch(() => setCarregando(false));
  }, []);

  const filtrados = busca
    ? clientes.filter((c) => [c.nome, c.telefone, c.email].some((v) => v?.toLowerCase().includes(busca.toLowerCase())))
    : clientes;

  function toggleSel(c) {
    setSelecionados((prev) =>
      prev.find((s) => s.id === c.id) ? prev.filter((s) => s.id !== c.id) : [...prev, c]
    );
  }

  async function criar(e) {
    e.preventDefault();
    if (!nome.trim() || selecionados.length === 0) return;
    setSalvando(true);
    try {
      const r = await api.post('/campanhas', {
        nome, objetivo,
        contatos: selecionados.map((c) => ({ ...c, tipo: 'cliente' })),
      });
      onCriada(r.data.id);
    } catch { setSalvando(false); }
  }

  const inputStyle = {
    background: 'rgba(244,244,248,0.05)', color: '#F4F4F8',
    border: '1px solid rgba(244,244,248,0.08)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <form onSubmit={criar}
        className="w-full max-w-sm rounded-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: '#13131A', border: '1px solid rgba(244,244,248,0.08)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: '#F4F4F8' }}>Nova campanha</h2>
          <button type="button" onClick={onClose} style={{ color: '#3A3A42' }}>
            <i className="ti ti-x text-lg" />
          </button>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Nome da campanha *</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required
            className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Objetivo / roteiro</label>
          <textarea value={objetivo} onChange={(e) => setObjetivo(e.target.value)} rows={2}
            placeholder="Ex.: Oferecer lançamento X, agendar visita…"
            className="w-full text-sm px-3 py-2 rounded outline-none resize-none" style={inputStyle} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: '#3A3A42' }}>
              Contatos ({selecionados.length} selecionados)
            </label>
            {selecionados.length > 0 && (
              <button type="button" onClick={() => setSelecionados([])}
                className="text-[11px]" style={{ color: '#E74C3C' }}>Limpar</button>
            )}
          </div>
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />

          <div className="max-h-40 overflow-y-auto space-y-1">
            {carregando ? (
              <p className="text-xs text-center py-4" style={{ color: '#3A3A42' }}>Carregando…</p>
            ) : filtrados.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: '#3A3A42' }}>Nenhum cliente encontrado</p>
            ) : filtrados.map((c) => {
              const sel = selecionados.find((s) => s.id === c.id);
              return (
                <button key={c.id} type="button" onClick={() => toggleSel(c)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors"
                  style={{
                    background: sel ? 'rgba(192,57,43,0.1)' : 'rgba(244,244,248,0.03)',
                    border: `1px solid ${sel ? 'rgba(192,57,43,0.3)' : 'rgba(244,244,248,0.05)'}`,
                  }}>
                  <i className={`ti ti-${sel ? 'check' : 'plus'} text-sm`}
                    style={{ color: sel ? '#E74C3C' : '#3A3A42' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#F4F4F8' }}>{c.nome}</p>
                    <p className="text-[11px] truncate" style={{ color: '#3A3A42' }}>{c.telefone}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando || !nome.trim() || selecionados.length === 0}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: '#C0392B', color: '#fff', opacity: (salvando || !nome.trim() || selecionados.length === 0) ? 0.5 : 1 }}>
            {salvando ? 'Criando…' : 'Criar e iniciar'}
          </button>
        </div>
      </form>
    </div>
  );
}
