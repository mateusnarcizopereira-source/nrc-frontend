import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  useSensor, useSensors, MouseSensor, TouchSensor,
} from '@dnd-kit/core';
import api from '../services/api';
import { STATUS_CONFIG } from './BadgeStatus';

const STAGES = [
  'tentando_contato', 'material_enviado', 'sem_resposta',
  'meeting_agendado', 'visita_agendada', 'proposta', 'venda_finalizada',
];
const PAGINA = 15;

function tempoNoEstagio(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const dias = Math.floor(ms / 86400000);
  if (dias >= 1) return `${dias}d no estágio`;
  const horas = Math.floor(ms / 3600000);
  if (horas >= 1) return `${horas}h no estágio`;
  return 'recente';
}
function valorEstimado(lead) {
  return (lead.faixaValor && (lead.faixaValor.max ?? lead.faixaValor.min)) || 0;
}
function fmtValorCurto(v) {
  if (!v) return null;
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1000) return `R$ ${Math.round(v / 1000)}k`;
  return `R$ ${v}`;
}

// ─── Card ─────────────────────────────────────────────────────
function CardKanban({ lead, overlay = false }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id, data: { fromStatus: lead.status },
  });
  const cor = STATUS_CONFIG[lead.status]?.hex || '#6A6A70';

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={() => { if (!overlay) navigate(`/leads/${lead.id}`); }}
      className="rounded-lg p-2.5 select-none"
      style={{
        background: '#141418', border: '1px solid rgba(244,244,248,0.08)',
        borderLeft: `2px solid ${cor}`,
        opacity: !overlay && isDragging ? 0.35 : 1,
        cursor: overlay ? 'grabbing' : 'grab',
        boxShadow: overlay ? '0 8px 24px rgba(0,0,0,0.5)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold truncate" style={{ color: '#F4F4F8' }}>{lead.nome}</p>
        {lead.temTarefaAtrasada && (
          <i className="ti ti-alarm text-[14px] flex-shrink-0" style={{ color: '#E74C3C' }} title="Tarefa atrasada" aria-hidden="true" />
        )}
      </div>
      {lead.empreendimento && (
        <p className="text-xs truncate mt-0.5" style={{ color: '#C0392B' }}>{lead.empreendimento}</p>
      )}
      <p className="text-[11px] mt-0.5" style={{ color: '#3A3A42' }}>{lead.telefone}</p>
      <p className="text-[10px] mt-1" style={{ color: '#4A4A52' }}>{tempoNoEstagio(lead.statusDesde)}</p>
    </div>
  );
}

// ─── Coluna ───────────────────────────────────────────────────
function Coluna({ status, leads, limite, onCarregarMais }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cfg = STATUS_CONFIG[status] || {};
  const total = leads.length;
  const valorTotal = leads.reduce((s, l) => s + valorEstimado(l), 0);
  const visiveis = leads.slice(0, limite);

  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: '260px' }}>
      {/* Header */}
      <div className="px-2 py-2 rounded-t-lg" style={{ background: '#0D0D0F', borderTop: `2px solid ${cfg.hex || '#3A3A42'}` }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide truncate" style={{ color: '#F4F4F8' }}>{cfg.label || status}</span>
          <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: cfg.hex || '#6A6A70' }}>{total}</span>
        </div>
        {valorTotal > 0 && (
          <p className="text-[10px] mt-0.5" style={{ color: '#4A4A52' }}>{fmtValorCurto(valorTotal)}</p>
        )}
      </div>
      {/* Corpo (scroll próprio) */}
      <div ref={setNodeRef}
        className="flex-1 p-1.5 space-y-1.5 overflow-y-auto rounded-b-lg"
        style={{
          background: isOver ? 'rgba(192,57,43,0.08)' : 'rgba(244,244,248,0.02)',
          border: '1px solid rgba(244,244,248,0.05)', borderTop: 'none',
          minHeight: '120px', maxHeight: 'calc(100vh - 280px)',
          transition: 'background 0.15s',
        }}>
        {visiveis.map((l) => <CardKanban key={l.id} lead={l} />)}
        {total > limite && (
          <button onClick={() => onCarregarMais(status)} className="w-full text-xs py-1.5 rounded"
            style={{ color: '#6A6A70', background: 'rgba(244,244,248,0.03)' }}>
            + {total - limite} mais
          </button>
        )}
        {total === 0 && <p className="text-[11px] text-center py-4" style={{ color: '#2A2A30' }}>—</p>}
      </div>
    </div>
  );
}

// ─── Zona de descarte ─────────────────────────────────────────
function ZonaDescarte() {
  const { setNodeRef, isOver } = useDroppable({ id: 'descartar' });
  return (
    <div ref={setNodeRef} className="flex flex-col items-center justify-center flex-shrink-0 rounded-lg"
      style={{
        width: '120px', border: `1px dashed ${isOver ? '#E74C3C' : 'rgba(244,244,248,0.12)'}`,
        background: isOver ? 'rgba(192,57,43,0.10)' : 'transparent', color: isOver ? '#E74C3C' : '#3A3A42',
      }}>
      <i className="ti ti-ban text-2xl" aria-hidden="true" />
      <span className="text-[10px] mt-1 text-center px-1">Arraste aqui p/ descartar</span>
    </div>
  );
}

// ─── Kanban ───────────────────────────────────────────────────
export default function KanbanLeads({ busca }) {
  const [grupos, setGrupos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [activeLead, setActiveLead] = useState(null);
  const [limites, setLimites] = useState({});
  const [descarteAlvo, setDescarteAlvo] = useState(null);
  const [motivos, setMotivos] = useState([]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Long-press de 200ms inicia o arraste no touch; toque curto = scroll horizontal.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api.get('/leads/kanban');
      setGrupos(r.data);
    } catch {}
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { api.get('/motivos-descarte').then((r) => setMotivos(r.data)).catch(() => {}); }, []);

  function acharLead(id) {
    for (const s of STAGES) {
      const l = grupos?.[s]?.leads.find((x) => x.id === id);
      if (l) return l;
    }
    return null;
  }

  function moverLocal(leadId, origem, alvo) {
    setGrupos((prev) => {
      const c = structuredClone(prev);
      const idx = c[origem].leads.findIndex((l) => l.id === leadId);
      if (idx < 0) return prev;
      const [lead] = c[origem].leads.splice(idx, 1);
      c[origem].total = Math.max(0, c[origem].total - 1);
      lead.status = alvo;
      lead.statusDesde = new Date().toISOString();
      c[alvo].leads.unshift(lead);
      c[alvo].total += 1;
      return c;
    });
  }

  function removerLocal(leadId) {
    setGrupos((prev) => {
      const c = structuredClone(prev);
      for (const s of STAGES) {
        const i = c[s].leads.findIndex((l) => l.id === leadId);
        if (i >= 0) { c[s].leads.splice(i, 1); c[s].total = Math.max(0, c[s].total - 1); break; }
      }
      return c;
    });
  }

  async function mudarEstagio(leadId, alvo, origem) {
    moverLocal(leadId, origem, alvo);
    try {
      await api.patch(`/leads/${leadId}/status`, { status: alvo });
    } catch (e) {
      alert(e.response?.data?.erro || 'Não foi possível mover o lead.');
      carregar(); // reverte para a verdade do servidor
    }
  }

  function onDragEnd(ev) {
    setActiveLead(null);
    const { active, over } = ev;
    if (!over) return;
    const alvo = over.id;
    const origem = active.data.current?.fromStatus;
    if (!origem || alvo === origem) return;
    const leadId = active.id;

    if (alvo === 'descartar') { setDescarteAlvo(leadId); return; }
    if (alvo === 'venda_finalizada') {
      if (!window.confirm('Mover para VENDA FINALIZADA? Confirma que a venda foi fechada?')) return;
    }
    mudarEstagio(leadId, alvo, origem);
  }

  async function confirmarDescarte(motivo) {
    const leadId = descarteAlvo;
    setDescarteAlvo(null);
    removerLocal(leadId);
    try {
      await api.post(`/leads/${leadId}/descartar`, { motivo });
    } catch (e) {
      alert(e.response?.data?.erro || 'Não foi possível descartar (só o corretor responsável pode).');
      carregar();
    }
  }

  const carregarMais = (status) => setLimites((l) => ({ ...l, [status]: (l[status] || PAGINA) + PAGINA }));

  // Filtro de busca aplicado no cliente (continua valendo no Kanban).
  function filtrar(leads) {
    if (!busca) return leads;
    const q = busca.toLowerCase();
    return leads.filter((l) => [l.nome, l.telefone, l.empreendimento].some((v) => v?.toLowerCase().includes(q)));
  }

  if (carregando || !grupos) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActiveLead(acharLead(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveLead(null)}>
      <div className="flex gap-2 overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {STAGES.map((s) => (
          <Coluna key={s} status={s} leads={filtrar(grupos[s].leads)}
            limite={limites[s] || PAGINA} onCarregarMais={carregarMais} />
        ))}
        <ZonaDescarte />
      </div>

      <DragOverlay>
        {activeLead ? <div style={{ width: '250px' }}><CardKanban lead={activeLead} overlay /></div> : null}
      </DragOverlay>

      {/* Modal de descarte */}
      {descarteAlvo && (
        <ModalDescarte motivos={motivos} onCancel={() => setDescarteAlvo(null)} onConfirm={confirmarDescarte} />
      )}
    </DndContext>
  );
}

function ModalDescarte({ motivos, onCancel, onConfirm }) {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onCancel}>
      <div className="w-full max-w-sm p-5 rounded-xl space-y-3" style={{ background: '#0D0D0F', border: '1px solid rgba(244,244,248,0.08)' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold" style={{ color: '#F4F4F8' }}>Marcar como Não Cliente?</h3>
        <p className="text-xs" style={{ color: '#6A6A70' }}>Escolha o motivo. Só o corretor responsável pode descartar.</p>
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {[...motivos.map((m) => m.texto), 'Outro'].map((m) => (
            <label key={m} className="flex items-center gap-2 p-2 rounded cursor-pointer text-sm"
              style={{ border: '1px solid', borderColor: motivo === m ? '#C0392B' : 'rgba(244,244,248,0.08)', color: '#A0A0A8' }}>
              <input type="radio" name="mot" checked={motivo === m} onChange={() => setMotivo(m)} className="accent-[#C0392B]" />
              {m}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-sm py-2 rounded font-medium" style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>Cancelar</button>
          <button onClick={() => motivo && onConfirm(motivo)} disabled={!motivo} className="flex-1 btn-primary" style={{ opacity: motivo ? 1 : 0.5 }}>Descartar</button>
        </div>
      </div>
    </div>
  );
}
