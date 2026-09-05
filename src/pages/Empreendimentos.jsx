import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const STATUS_OPCOES = ['Lançamento', 'Em obras', 'Pronto'];
const TIPOLOGIAS = ['Studio', '1 dorm', '2 dorm', '2 dorm suíte', '3 dorm', '4+ dorm', 'Cobertura'];

const STATUS_BADGE = {
  'Lançamento': { bg: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent-hover)' },
  'Em obras':   { bg: 'rgba(var(--warning-rgb), 0.15)', color: 'var(--warning)' },
  'Pronto':     { bg: 'rgba(var(--success-rgb), 0.15)',  color: 'var(--success)' },
};

function fmtValor(v) {
  if (v == null) return null;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const TIPOS_ACEITOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const LIMITE_MB = 0.8; // mesmo teto do backend (materialService.js) — 800KB brutos

function lerComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // remove o prefixo "data:...;base64,"
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmtTamanho(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(0)}KB`;
}

// Repositório de materiais por empreendimento (Fase 2, item 8 do redesign).
// Visível/editável só pra quem já chega nesta tela (gerente/editor — mesmo
// allow-list do resto de Empreendimentos). O corretor não usa esta tela; ele
// acessa o mesmo material via o botão de WhatsApp na ficha do lead (item 9),
// que chama a mesma API de listagem (liberada pro perfil corretor no backend).
function MateriaisPanel({ empreendimentoId }) {
  const [materiais, setMateriais] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const r = await api.get(`/empreendimentos/${empreendimentoId}/materiais`);
      setMateriais(r.data);
    } catch {
      setErro('Erro ao carregar materiais.');
    }
  }, [empreendimentoId]);

  useEffect(() => { carregar(); }, [carregar]);

  async function onEscolherArquivo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErro('');
    if (!TIPOS_ACEITOS.includes(file.type)) {
      setErro('Tipo não aceito. Use PDF, PNG, JPEG ou WEBP.');
      return;
    }
    if (file.size > LIMITE_MB * 1024 * 1024) {
      setErro(`Arquivo muito grande (máx. ${LIMITE_MB * 1024}KB).`);
      return;
    }
    setEnviando(true);
    try {
      const dataBase64 = await lerComoBase64(file);
      await api.post(`/empreendimentos/${empreendimentoId}/materiais`, {
        nome: file.name, tipo: file.type, dataBase64,
      });
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao enviar arquivo.');
    }
    setEnviando(false);
  }

  async function remover(materialId) {
    if (!window.confirm('Remover este material?')) return;
    try {
      await api.delete(`/empreendimentos/${empreendimentoId}/materiais/${materialId}`);
      setMateriais((prev) => prev.filter((m) => m.id !== materialId));
    } catch {
      setErro('Erro ao remover.');
    }
  }

  const urlArquivo = (m) =>
    `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api')}/empreendimentos/${empreendimentoId}/materiais/${m.id}/arquivo`;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          Materiais {materiais ? `(${materiais.length})` : ''}
        </p>
        <label className="text-xs font-medium flex items-center gap-1 cursor-pointer" style={{ color: 'var(--accent)' }}>
          <i className="ti ti-upload text-[14px]" aria-hidden="true" />
          {enviando ? 'Enviando...' : 'Anexar'}
          <input type="file" className="hidden" accept={TIPOS_ACEITOS.join(',')} onChange={onEscolherArquivo} disabled={enviando} />
        </label>
      </div>

      {erro && <p className="text-xs mb-2" style={{ color: 'var(--accent)' }}>{erro}</p>}

      {materiais === null ? (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Carregando...</p>
      ) : materiais.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Nenhum material anexado (tabela de valores, book, plantas...).</p>
      ) : (
        <div className="space-y-1">
          {materiais.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded"
              style={{ background: 'rgba(var(--ink-rgb), 0.03)' }}>
              <i className={`ti ti-${m.tipo === 'application/pdf' ? 'file-type-pdf' : 'photo'} text-[16px] flex-shrink-0`}
                style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
              <a href={urlArquivo(m)} target="_blank" rel="noopener noreferrer"
                className="text-xs flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                {m.nome}
              </a>
              <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{fmtTamanho(m.tamanhoBytes)}</span>
              <button onClick={() => remover(m.id)} title="Remover" className="flex-shrink-0 p-0.5"
                style={{ color: 'var(--text-faint)' }}
                onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-faint)')}>
                <i className="ti ti-trash text-[14px]" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Empreendimentos() {
  const { usuario } = useAuth();
  const podeEditar = ['gerente', 'editor'].includes(usuario?.perfil);

  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('true'); // 'true' | 'false' | ''
  const [modal, setModal] = useState(null); // null | {} (novo) | registro (editar)
  const [materiaisAbertos, setMateriaisAbertos] = useState(() => new Set());

  function toggleMateriais(id) {
    setMateriaisAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  }

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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Empreendimentos</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
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
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--surface-2)', border: '1px solid rgba(var(--ink-rgb), 0.10)', color: 'var(--text-tertiary)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <div className="card text-center py-12">
          <i className="ti ti-building-off text-4xl block mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Nenhum empreendimento encontrado.</p>
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
                      <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{e.nome}</h3>
                      {e.status && sb && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: sb.bg, color: sb.color }}>{e.status}</span>
                      )}
                      {!e.ativo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(var(--ink-rgb), 0.4)', color: 'var(--text-tertiary)' }}>inativo</span>
                      )}
                    </div>
                    {e.construtora && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{e.construtora}</p>
                    )}
                    {(e.bairro || e.cidade) && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <i className="ti ti-map-pin mr-1" aria-hidden="true" />
                        {[e.bairro, e.cidade].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {(min || max) && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {min && max ? `${min} — ${max}` : (min || max)}
                      </p>
                    )}
                    {e.tipologias?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {e.tipologias.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(var(--ink-rgb), 0.05)', color: 'var(--text-tertiary)' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {podeEditar && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => toggleMateriais(e.id)} title="Materiais" className="p-1.5 rounded"
                        style={{ color: materiaisAbertos.has(e.id) ? 'var(--accent)' : 'var(--text-muted)' }}
                        onMouseEnter={(ev) => { if (!materiaisAbertos.has(e.id)) ev.currentTarget.style.color = 'var(--text)'; }}
                        onMouseLeave={(ev) => { if (!materiaisAbertos.has(e.id)) ev.currentTarget.style.color = 'var(--text-muted)'; }}>
                        <i className="ti ti-paperclip text-base" aria-hidden="true" />
                      </button>
                      <button onClick={() => setModal(e)} title="Editar" className="p-1.5 rounded"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--text)')}
                        onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-muted)')}>
                        <i className="ti ti-pencil text-base" aria-hidden="true" />
                      </button>
                      <button onClick={() => remover(e)} title="Remover" className="p-1.5 rounded"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--accent-hover)')}
                        onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-muted)')}>
                        <i className="ti ti-trash text-base" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
                {podeEditar && materiaisAbertos.has(e.id) && <MateriaisPanel empreendimentoId={e.id} />}
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
        style={{ background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.08)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>
            {editando ? 'Editar empreendimento' : 'Novo empreendimento'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <i className="ti ti-x text-lg" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nome *</label>
          <input className="input" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Construtora</label>
            <input className="input" value={form.construtora} onChange={(e) => set('construtora', e.target.value)} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="">—</option>
              {STATUS_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Endereço</label>
          <input className="input" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Bairro</label>
            <input className="input" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Cidade</label>
            <input className="input" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Faixa de valor (R$)</label>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className="input" placeholder="Mínimo" value={form.faixaValor.min}
              onChange={(e) => set('faixaValor', { ...form.faixaValor, min: e.target.value })} />
            <input type="number" className="input" placeholder="Máximo" value={form.faixaValor.max}
              onChange={(e) => set('faixaValor', { ...form.faixaValor, max: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Tipologias disponíveis</label>
          <div className="flex flex-wrap gap-1.5">
            {TIPOLOGIAS.map((t) => {
              const on = form.tipologias.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleTipologia(t)}
                  className="px-2.5 py-1 text-xs rounded-full transition-colors"
                  style={on
                    ? { background: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent-hover)', border: '1px solid rgba(var(--accent-rgb), 0.4)' }
                    : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(var(--ink-rgb), 0.10)' }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Observações</label>
          <textarea className="input resize-y min-h-[60px]" value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={form.ativo} onChange={(e) => set('ativo', e.target.checked)}
            className="accent-[var(--accent)]" />
          Ativo
        </label>

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
