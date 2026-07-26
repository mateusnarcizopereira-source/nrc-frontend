import { useState, useEffect } from 'react';
import api from '../services/api';
import { TIPOS, isoParaInputLocal, inputLocalParaIso } from './TarefaCard';

const inputStyle = 'input';

// ─── Criar / Editar ───────────────────────────────────────────
export function TarefaFormModal({ tarefa, leadIdFixo, leadNomeFixo, usuario, modoSolo, onClose, onSalvo }) {
  const editando = Boolean(tarefa?.id);
  const [form, setForm] = useState({
    leadId: tarefa?.leadId || leadIdFixo || '',
    titulo: tarefa?.titulo || '',
    tipo: tarefa?.tipo || 'Ligar',
    dataHora: isoParaInputLocal(tarefa?.dataHora) || '',
    descricao: tarefa?.descricao || '',
    responsavelId: tarefa?.responsavelId || '',
    responsavelNome: tarefa?.responsavelNome || '',
  });
  const [leads, setLeads] = useState([]);
  const [corretores, setCorretores] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Responsável só aparece em modo equipe para gerente/editor
  const mostrarResponsavel = !modoSolo && ['gerente', 'editor'].includes(usuario?.perfil);
  const precisaSelecionarLead = !editando && !leadIdFixo;

  useEffect(() => {
    if (precisaSelecionarLead) api.get('/leads').then((r) => setLeads(r.data)).catch(() => {});
    if (mostrarResponsavel) api.get('/corretores').then((r) => setCorretores(r.data)).catch(() => {});
  }, [precisaSelecionarLead, mostrarResponsavel]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.titulo.trim()) { setErro('Título é obrigatório.'); return; }
    if (!form.leadId) { setErro('Selecione o lead.'); return; }
    setSalvando(true);
    try {
      const payload = {
        titulo: form.titulo,
        tipo: form.tipo,
        dataHora: inputLocalParaIso(form.dataHora),
        descricao: form.descricao,
      };
      if (mostrarResponsavel && form.responsavelId) {
        payload.responsavelId = form.responsavelId;
        payload.responsavelNome = corretores.find((c) => c.id === form.responsavelId)?.nome || form.responsavelNome;
      }
      if (editando) {
        await api.patch(`/tarefas/${tarefa.id}`, payload);
      } else {
        await api.post('/tarefas', { ...payload, leadId: form.leadId });
      }
      onSalvo();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar tarefa.');
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
            {editando ? 'Editar tarefa' : 'Nova tarefa'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: '#3A3A42' }}>
            <i className="ti ti-x text-lg" aria-hidden="true" />
          </button>
        </div>

        {leadNomeFixo && (
          <p className="text-xs" style={{ color: '#6A6A70' }}>Lead: <span style={{ color: '#C0392B' }}>{leadNomeFixo}</span></p>
        )}

        {precisaSelecionarLead && (
          <div>
            <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Lead *</label>
            <select className={inputStyle} value={form.leadId} onChange={(e) => set('leadId', e.target.value)} required>
              <option value="">Selecione...</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.nome} — {l.empreendimento}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Título *</label>
          <input className={inputStyle} value={form.titulo} onChange={(e) => set('titulo', e.target.value)}
            placeholder="Ex: Ligar para apresentar proposta" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Tipo</label>
            <select className={inputStyle} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Data e hora</label>
            <input type="datetime-local" className={inputStyle} value={form.dataHora}
              onChange={(e) => set('dataHora', e.target.value)} />
          </div>
        </div>

        {mostrarResponsavel && (
          <div>
            <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Responsável</label>
            <select className={inputStyle} value={form.responsavelId} onChange={(e) => set('responsavelId', e.target.value)}>
              <option value="">Corretor do lead (padrão)</option>
              {corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Descrição</label>
          <textarea className={`${inputStyle} resize-y min-h-[60px]`} value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)} />
        </div>

        {erro && (
          <p className="text-xs px-3 py-2 rounded"
            style={{ background: 'rgba(192,57,43,0.1)', color: '#E74C3C', border: '1px solid rgba(192,57,43,0.2)' }}>{erro}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>Cancelar</button>
          <button type="submit" disabled={salvando} className="flex-1 btn-primary">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Concluir ─────────────────────────────────────────────────
export function ConcluirTarefaModal({ tarefa, onClose, onConcluido }) {
  const [resultado, setResultado] = useState('');
  const [criarProxima, setCriarProxima] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function confirmar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post(`/tarefas/${tarefa.id}/concluir`, { resultado });
      onConcluido({ criarProxima });
    } catch {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <form onSubmit={confirmar}
        className="w-full max-w-sm rounded-xl p-5 space-y-3"
        style={{ background: '#0D0D0F', border: '1px solid rgba(244,244,248,0.08)' }}
        onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-base" style={{ color: '#F4F4F8' }}>Concluir tarefa</h2>
        <p className="text-xs" style={{ color: '#6A6A70' }}>{tarefa.titulo}</p>

        <div>
          <label className="text-xs block mb-1" style={{ color: '#4A4A52' }}>Resultado</label>
          <textarea className="input resize-y min-h-[70px]" value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            placeholder="Ex: Cliente atendeu, pediu para ligar amanhã à tarde."
            autoFocus />
          <p className="text-[11px] mt-1" style={{ color: '#3A3A42' }}>
            O resultado vira um registro na timeline do lead.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: '#A0A0A8' }}>
          <input type="checkbox" checked={criarProxima} onChange={(e) => setCriarProxima(e.target.checked)}
            className="accent-[#C0392B]" />
          Criar próxima tarefa na sequência
        </label>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>Cancelar</button>
          <button type="submit" disabled={salvando} className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: '#27AE60', color: '#fff', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Concluindo...' : 'Concluir'}
          </button>
        </div>
      </form>
    </div>
  );
}
