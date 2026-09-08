import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const STATUS_OPCOES = ['Lançamento', 'Em obras', 'Pronto para morar'];

const STATUS_BADGE = {
  'Lançamento':        { bg: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent-hover)' },
  'Em obras':          { bg: 'rgba(var(--warning-rgb), 0.15)', color: 'var(--warning)' },
  'Pronto para morar': { bg: 'rgba(var(--success-rgb), 0.15)', color: 'var(--success)' },
};

const FILTRO_VAZIO = { bairro: '', tipologia: '', metragemDe: '', metragemAte: '', precoDe: '', precoAte: '', status: '' };

const FILTRO_STYLE = {
  background: 'rgba(var(--ink-rgb), 0.05)', color: 'var(--text)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
};

function fmtPreco(v) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function fmtMetragem(v) {
  return v == null ? '—' : `${v}m²`;
}

// Uma linha de tipologia "bate" com o filtro se TODOS os critérios
// preenchidos baterem — critério vazio não restringe nada. Metragem/preço
// nulos na linha nunca batem com um filtro de/até preenchido (não dá pra
// confirmar que um valor ausente está dentro de uma faixa).
function linhaBate(t, f) {
  if (f.tipologia && t.tipologia !== f.tipologia) return false;
  if (f.metragemDe !== '' && (t.metragem == null || t.metragem < Number(f.metragemDe))) return false;
  if (f.metragemAte !== '' && (t.metragem == null || t.metragem > Number(f.metragemAte))) return false;
  if (f.precoDe !== '' && (t.preco == null || t.preco < Number(f.precoDe))) return false;
  if (f.precoAte !== '' && (t.preco == null || t.preco > Number(f.precoAte))) return false;
  return true;
}

// Um projeto aparece no resultado se bairro bate (ou vazio) E status bate
// (ou vazio) E pelo menos uma linha de tipologia bate — e mostra só as
// linhas que bateram, não a lista inteira do projeto.
function projetoFiltrado(projeto, f) {
  if (f.bairro && projeto.bairro !== f.bairro) return null;
  if (f.status && projeto.statusObra !== f.status) return null;
  const linhas = (projeto.tipologias || []).filter((t) => linhaBate(t, f));
  if (linhas.length === 0) return null;
  return { ...projeto, linhasFiltradas: linhas };
}

export default function Radar() {
  const { usuario } = useAuth();
  const podeEditar = ['gerente', 'editor'].includes(usuario?.perfil);

  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [modal, setModal] = useState(null); // null | {} (novo) | registro (editar)

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await api.get('/radar');
      setLista(r.data);
    } catch {
      setErro('Não foi possível carregar o Radar.');
    }
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const bairros = useMemo(
    () => [...new Set(lista.map((p) => p.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [lista]
  );
  const tipologiasDisponiveis = useMemo(() => {
    const set = new Set();
    lista.forEach((p) => (p.tipologias || []).forEach((t) => { if (t.tipologia) set.add(t.tipologia); }));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [lista]);

  const resultados = useMemo(
    () => lista.map((p) => projetoFiltrado(p, filtro)).filter(Boolean),
    [lista, filtro]
  );

  const setF = (k, v) => setFiltro((f) => ({ ...f, [k]: v }));
  const limparFiltros = () => setFiltro(FILTRO_VAZIO);
  const filtrosAtivos = Object.values(filtro).some((v) => v !== '');

  async function remover(p) {
    if (!window.confirm(`Remover "${p.nomeProjeto}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/radar/${p.id}`);
      setLista((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao remover.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Radar</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Imóveis da concorrência — referência para quando o cliente quer algo que a Empyrus não tem.
          </p>
        </div>
        {podeEditar && (
          <button onClick={() => setModal({})} className="btn-primary text-sm whitespace-nowrap">
            <i className="ti ti-plus mr-1.5" aria-hidden="true" />Novo projeto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Bairro</label>
            <select value={filtro.bairro} onChange={(e) => setF('bairro', e.target.value)}
              className="w-full text-sm px-2 py-2 rounded outline-none" style={FILTRO_STYLE}>
              <option value="">Todos</option>
              {bairros.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Tipologia</label>
            <select value={filtro.tipologia} onChange={(e) => setF('tipologia', e.target.value)}
              className="w-full text-sm px-2 py-2 rounded outline-none" style={FILTRO_STYLE}>
              <option value="">Todas</option>
              {tipologiasDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Status da obra</label>
            <select value={filtro.status} onChange={(e) => setF('status', e.target.value)}
              className="w-full text-sm px-2 py-2 rounded outline-none" style={FILTRO_STYLE}>
              <option value="">Todos</option>
              {STATUS_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Metragem de (m²)</label>
            <input type="number" value={filtro.metragemDe} onChange={(e) => setF('metragemDe', e.target.value)}
              className="w-full text-sm px-2 py-2 rounded outline-none" style={FILTRO_STYLE} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Metragem até (m²)</label>
            <input type="number" value={filtro.metragemAte} onChange={(e) => setF('metragemAte', e.target.value)}
              className="w-full text-sm px-2 py-2 rounded outline-none" style={FILTRO_STYLE} />
          </div>
          <div />
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Preço de (R$)</label>
            <input type="number" value={filtro.precoDe} onChange={(e) => setF('precoDe', e.target.value)}
              className="w-full text-sm px-2 py-2 rounded outline-none" style={FILTRO_STYLE} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Preço até (R$)</label>
            <input type="number" value={filtro.precoAte} onChange={(e) => setF('precoAte', e.target.value)}
              className="w-full text-sm px-2 py-2 rounded outline-none" style={FILTRO_STYLE} />
          </div>
        </div>
        {filtrosAtivos && (
          <button onClick={limparFiltros} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            <i className="ti ti-x mr-1" aria-hidden="true" />Limpar filtros
          </button>
        )}
      </div>

      {erro && (
        <div className="card text-center py-8">
          <p style={{ color: 'var(--accent)' }}>{erro}</p>
        </div>
      )}

      {!erro && carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !erro && resultados.length === 0 ? (
        <div className="card text-center py-12">
          <i className="ti ti-radar-off text-4xl block mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>
            {lista.length === 0 ? 'Nenhum projeto cadastrado ainda.' : 'Nenhum projeto encontrado com esses filtros.'}
          </p>
        </div>
      ) : !erro && (
        <div className="grid gap-3">
          {resultados.map((p) => {
            const sb = STATUS_BADGE[p.statusObra];
            return (
              <div key={p.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{p.nomeProjeto}</h3>
                      {p.statusObra && sb && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: sb.bg, color: sb.color }}>{p.statusObra}</span>
                      )}
                    </div>
                    {p.bairro && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <i className="ti ti-map-pin mr-1" aria-hidden="true" />{p.bairro}
                      </p>
                    )}
                    <div className="mt-2.5 space-y-1">
                      {p.linhasFiltradas.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 text-xs px-2.5 py-1.5 rounded"
                          style={{ background: 'rgba(var(--ink-rgb), 0.03)' }}>
                          <span className="font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>{t.tipologia || '—'}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{fmtMetragem(t.metragem)}</span>
                          <span className="font-semibold" style={{ color: 'var(--text)' }}>{fmtPreco(t.preco)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {podeEditar && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setModal(p)} title="Editar" className="p-1.5 rounded"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--text)')}
                        onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-muted)')}>
                        <i className="ti ti-pencil text-base" aria-hidden="true" />
                      </button>
                      <button onClick={() => remover(p)} title="Remover" className="p-1.5 rounded"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--accent-hover)')}
                        onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-muted)')}>
                        <i className="ti ti-trash text-base" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && podeEditar && (
        <RadarModal
          registro={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSalvo={() => { setModal(null); carregar(); }}
        />
      )}
    </div>
  );
}

function linhaVazia() {
  return { id: `novo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, tipologia: '', metragem: '', preco: '' };
}

function RadarModal({ registro, onClose, onSalvo }) {
  const editando = Boolean(registro?.id);
  const [form, setForm] = useState({
    nomeProjeto: registro?.nomeProjeto || '',
    bairro: registro?.bairro || '',
    statusObra: registro?.statusObra || '',
    tipologias: registro?.tipologias?.length ? registro.tipologias.map((t) => ({ ...t, metragem: t.metragem ?? '', preco: t.preco ?? '' })) : [linhaVazia()],
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLinha = (id, campo, v) =>
    setForm((f) => ({ ...f, tipologias: f.tipologias.map((t) => (t.id === id ? { ...t, [campo]: v } : t)) }));
  const adicionarLinha = () => setForm((f) => ({ ...f, tipologias: [...f.tipologias, linhaVazia()] }));
  const removerLinha = (id) => setForm((f) => ({ ...f, tipologias: f.tipologias.filter((t) => t.id !== id) }));

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.nomeProjeto.trim()) { setErro('Nome do projeto é obrigatório.'); return; }
    setSalvando(true);
    try {
      if (editando) await api.put(`/radar/${registro.id}`, form);
      else await api.post('/radar', form);
      onSalvo();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar.');
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <form onSubmit={salvar}
        className="w-full max-w-lg rounded-xl p-5 space-y-3 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.08)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>
            {editando ? 'Editar projeto' : 'Novo projeto (concorrência)'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <i className="ti ti-x text-lg" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nome do projeto *</label>
          <input className="input" value={form.nomeProjeto} onChange={(e) => set('nomeProjeto', e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Bairro</label>
            <input className="input" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Status da obra</label>
            <select className="input" value={form.statusObra} onChange={(e) => set('statusObra', e.target.value)}>
              <option value="">—</option>
              {STATUS_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Tipologias</label>
            <button type="button" onClick={adicionarLinha} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              <i className="ti ti-plus mr-1" aria-hidden="true" />Adicionar tipologia
            </button>
          </div>
          <div className="space-y-2">
            {form.tipologias.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <input className="input flex-[1.4] min-w-0" placeholder="Tipologia (ex: 2 dorm)"
                  value={t.tipologia} onChange={(e) => setLinha(t.id, 'tipologia', e.target.value)} />
                <input type="number" className="input flex-1 min-w-0" placeholder="m²"
                  value={t.metragem} onChange={(e) => setLinha(t.id, 'metragem', e.target.value)} />
                <input type="number" className="input flex-1 min-w-0" placeholder="Preço"
                  value={t.preco} onChange={(e) => setLinha(t.id, 'preco', e.target.value)} />
                <button type="button" onClick={() => removerLinha(t.id)} title="Remover linha"
                  className="p-1.5 flex-shrink-0" style={{ color: 'var(--text-faint)' }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-faint)')}>
                  <i className="ti ti-trash text-base" aria-hidden="true" />
                </button>
              </div>
            ))}
            {form.tipologias.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Nenhuma tipologia — adicione ao menos uma linha.</p>
            )}
          </div>
        </div>

        {erro && (
          <p className="text-xs px-3 py-2 rounded"
            style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent-hover)', border: '1px solid rgba(var(--accent-rgb), 0.2)' }}>
            {erro}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: 'rgba(var(--ink-rgb), 0.06)', color: 'var(--text)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="flex-1 btn-primary">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
