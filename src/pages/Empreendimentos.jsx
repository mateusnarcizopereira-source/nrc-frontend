import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const STATUS_OPCOES = ['Lançamento', 'Em obras', 'Pronto'];
const TIPOLOGIAS = ['Studio', '1 dorm', '2 dorm', '2 dorm suíte', '3 dorm', '4+ dorm', 'Cobertura'];

const STATUS_BADGE = {
  'Lançamento': { bg: 'rgba(192,57,43,0.15)', color: '#E74C3C' },
  'Em obras':   { bg: 'rgba(230,126,34,0.15)', color: '#E67E22' },
  'Pronto':     { bg: 'rgba(39,174,96,0.15)',  color: '#27AE60' },
};

function fmtValor(v) {
  if (v == null) return null;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export default function Empreendimentos() {
  const { usuario } = useAuth();
  const podeEditar = ['gerente', 'editor'].includes(usuario?.perfil);

  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('true'); // 'true' | 'false' | ''
  const [modal, setModal] = useState(null); // null | {} (novo) | registro (editar)

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = {};
      if (busca) params.busca = busca;
      if (filtroAtivo) params.ativo = filtroAtivo;
      const r = await api.get('/empreendimentos', { params });
      setLista(r.data);
    } catch {}
    setCarregando(false);
  }, [busca, filtroAtivo]);

  useEffect(() => { carregar(); }, [carregar]);

  async function remover(e) {
    if (!window.confirm(`Remover "${e.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/empreendimentos/${e.id}`);
      setLista((prev) => prev.filter((x) => x.id !== e.id));
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao remover.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>Empreendimentos</h1>
          <p className="text-sm" style={{ color: '#6A6A70' }}>
            {lista.length} {lista.length === 1 ? 'empreendimento' : 'empreendimentos'}
          </p>
        </div>
        {podeEditar && (
          <button onClick={() => setModal({})} className="btn-primary text-sm whitespace-nowrap">
            <i className="ti ti-plus mr-1.5" aria-hidden="true" />Novo
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input sm:max-w-xs"
          placeholder="Buscar por nome, construtora, bairro..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="flex gap-2">
          {[['true', 'Ativos'], ['false', 'Inativos'], ['', 'Todos']].map(([v, label]) => (
            <button
              key={label}
              onClick={() => setFiltroAtivo(v)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={filtroAtivo === v
                ? { background: '#C0392B', color: '#fff' }
                : { background: '#141418', border: '1px solid rgba(244,244,248,0.10)', color: '#6A6A70' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <div className="card text-center py-12">
          <i className="ti ti-building-off text-4xl block mb-3" style={{ color: '#3A3A42' }} />
          <p style={{ color: '#3A3A42' }}>Nenhum empreendimento encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {lista.map((e) => {
            const sb = STATUS_BADGE[e.status];
            const min = fmtValor(e.faixaValor?.min);
            const max = fmtValor(e.faixaValor?.max);
            return (
              <div key={e.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold" style={{ color: '#F4F4F8' }}>{e.nome}</h3>
                      {e.status && sb && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: sb.bg, color: sb.color }}>{e.status}</span>
                      )}
                      {!e.ativo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(58,58,66,0.4)', color: '#6B6B78' }}>inativo</span>
                      )}
                    </div>
                    {e.construtora && (
                      <p className="text-xs mt-0.5" style={{ color: '#6A6A70' }}>{e.construtora}</p>
                    )}
                    {(e.bairro || e.cidade) && (
                      <p className="text-xs mt-0.5" style={{ color: '#3A3A42' }}>
                        <i className="ti ti-map-pin mr-1" aria-hidden="true" />
                        {[e.bairro, e.cidade].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {(min || max) && (
                      <p className="text-xs mt-1" style={{ color: '#4A4A52' }}>
                        {min && max ? `${min} — ${max}` : (min || max)}
                      </p>
                    )}
                    {e.tipologias?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {e.tipologias.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(244,244,248,0.05)', color: '#6A6A70' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {podeEditar && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setModal(e)} title="Editar" className="p-1.5 rounded"
                        style={{ color: '#3A3A42' }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.color = '#F4F4F8')}
                        onMouseLeave={(ev) => (ev.currentTarget.style.color = '#3A3A42')}>
                        <i className="ti ti-pencil text-base" aria-hidden="true" />
                      </button>
                      <button onClick={() => remover(e)} title="Remover" className="p-1.5 rounded"
                        style={{ color: '#3A3A42' }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.color = '#E74C3C')}
                        onMouseLeave={(ev) => (ev.currentTarget.style.color = '#3A3A42')}>
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
        <EmpreendimentoModal
          registro={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSalvo={() => { setModal(null); carregar(); }}
        />
      )}
    </div>
  );
}

function EmpreendimentoModal({ registro, onClose, onSalvo }) {
  const editando = Boolean(registro?.id);
  const [form, setForm] = useState({
    nome: registro?.nome || '',
    construtora: registro?.construtora || '',
    endereco: registro?.endereco || '',
    bairro: registro?.bairro || '',
    cidade: registro?.cidade || '',
    tipologias: registro?.tipologias || [],
    faixaValor: { min: registro?.faixaValor?.min ?? '', max: registro?.faixaValor?.max ?? '' },
    status: registro?.status || '',
    observacoes: registro?.observacoes || '',
    ativo: registro?.ativo ?? true,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTipologia = (t) =>
    setForm((f) => ({
      ...f,
      tipologias: f.tipologias.includes(t) ? f.tipologias.filter((x) => x !== t) : [...f.tipologias, t],
    }));

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setSalvando(true);
    try {
      if (editando) await api.put(`/empreendimentos/${registro.id}`, form);
      else await api.post('/empreendimentos', form);
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
        className="w-full max-w-md rounded-xl p-5 space-y-3 max-h-[90vh] overflow-y-auto"
        style={{ background: '#0D0D0F', border: '1px solid rgba(244,244,248,0.08)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: '#F4F4F8' }}>
            {editando ? 'Editar empreendimento' : 'Novo empreendimento'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: '#3A3A42' }}>
            <i className="ti ti-x text-lg" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Nome *</label>
          <input className="input" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Construtora</label>
            <input className="input" value={form.construtora} onChange={(e) => set('construtora', e.target.value)} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Status</label>
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="">—</option>
              {STATUS_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Endereço</label>
          <input className="input" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Bairro</label>
            <input className="input" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Cidade</label>
            <input className="input" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Faixa de valor (R$)</label>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className="input" placeholder="Mínimo" value={form.faixaValor.min}
              onChange={(e) => set('faixaValor', { ...form.faixaValor, min: e.target.value })} />
            <input type="number" className="input" placeholder="Máximo" value={form.faixaValor.max}
              onChange={(e) => set('faixaValor', { ...form.faixaValor, max: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1.5" style={{ color: '#4A4A52' }}>Tipologias disponíveis</label>
          <div className="flex flex-wrap gap-1.5">
            {TIPOLOGIAS.map((t) => {
              const on = form.tipologias.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleTipologia(t)}
                  className="px-2.5 py-1 text-xs rounded-full transition-colors"
                  style={on
                    ? { background: 'rgba(192,57,43,0.15)', color: '#E74C3C', border: '1px solid rgba(192,57,43,0.4)' }
                    : { background: 'transparent', color: '#4A4A52', border: '1px solid rgba(244,244,248,0.10)' }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Observações</label>
          <textarea className="input resize-y min-h-[60px]" value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: '#A0A0A8' }}>
          <input type="checkbox" checked={form.ativo} onChange={(e) => set('ativo', e.target.checked)}
            className="accent-[#C0392B]" />
          Ativo
        </label>

        {erro && (
          <p className="text-xs px-3 py-2 rounded"
            style={{ background: 'rgba(192,57,43,0.1)', color: '#E74C3C', border: '1px solid rgba(192,57,43,0.2)' }}>
            {erro}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
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
