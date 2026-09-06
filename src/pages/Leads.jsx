import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import BadgeStatus from '../components/BadgeStatus';
import KanbanLeads from '../components/KanbanLeads';
import ImportarLeadsModal from '../components/ImportarLeadsModal';
import { numeroWhatsapp } from '../utils/whatsapp';

const VIEW_KEY = 'nrc_leads_view';

const FILTROS = [
  { key: 'todos',             label: 'Todos'              },
  { key: 'tentando_contato',  label: 'Tentando Contato'   },
  { key: 'material_enviado',  label: 'Material Enviado'   },
  { key: 'sem_resposta',      label: 'Sem Resposta'       },
  { key: 'meeting_agendado',  label: 'Meeting Agendado'   },
  { key: 'visita_agendada',   label: 'Visita Agendada'    },
  { key: 'proposta',          label: 'Proposta'           },
  { key: 'venda_finalizada',  label: 'Venda Finalizada'   },
];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'lista');
  const [modalImportar, setModalImportar] = useState(false);
  const { usuario } = useAuth();
  const podeImportar = ['gerente', 'editor'].includes(usuario?.perfil);

  function trocarView(v) { setView(v); localStorage.setItem(VIEW_KEY, v); }

  function carregar() {
    setCarregando(true);
    api.get('/leads').then((r) => setLeads(r.data)).finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, []);

  const filtrados = leads.filter((l) => {
    const matchStatus = filtro === 'todos' || l.status === filtro;
    const matchBusca  = !busca || [l.nome, l.telefone, l.empreendimento, l.corretorNome]
      .some((v) => v?.toLowerCase().includes(busca.toLowerCase()));
    return matchStatus && matchBusca;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Leads</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {view === 'kanban' ? 'Quadro por estágio' : `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {podeImportar && (
            <button onClick={() => setModalImportar(true)}
              className="text-xs px-3 py-1.5 rounded font-medium"
              style={{ background: 'rgba(var(--ink-rgb), 0.06)', color: 'var(--text)', border: '1px solid rgba(var(--ink-rgb), 0.08)' }}>
              <i className="ti ti-upload mr-1" aria-hidden="true" />
              <span className="hidden sm:inline">Importar</span>
            </button>
          )}
          {/* Toggle Lista / Kanban */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(var(--ink-rgb), 0.10)' }}>
            {[['lista', 'list'], ['kanban', 'layout-kanban']].map(([v, icon]) => (
              <button key={v} onClick={() => trocarView(v)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={view === v
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--text-tertiary)' }}>
                <i className={`ti ti-${icon} text-[14px]`} aria-hidden="true" />
                <span className="ml-1 hidden sm:inline capitalize">{v}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {modalImportar && (
        <ImportarLeadsModal
          onClose={() => setModalImportar(false)}
          onImportado={() => { setModalImportar(false); carregar(); }}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input sm:max-w-xs"
          placeholder="Buscar por nome, telefone, empreendimento..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {view === 'lista' && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTROS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                style={
                  filtro === f.key
                    ? { background: 'var(--accent)', color: '#fff', border: '1px solid transparent' }
                    : { background: 'var(--surface-2)', border: '1px solid rgba(var(--ink-rgb), 0.10)', color: 'var(--text-tertiary)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'kanban' ? (
        <KanbanLeads busca={busca} />
      ) : carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: 'var(--text-muted)' }}>Nenhum lead encontrado.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtrados.map((lead) => <LeadCard key={lead.id} lead={lead} usuario={usuario} />)}
        </div>
      )}
    </div>
  );
}

// Card de lead (ajuste Fase 1, item 4 — grid em vez de lista simples).
function LeadCard({ lead, usuario }) {
  // Mesma regra de dono usada em LeadDetalhe (podeEscrever) — só o corretor
  // responsável vê o ícone de remover (abre o fluxo de descarte existente).
  const podeRemover = usuario?.perfil === 'corretor' && lead.corretorId === usuario?.id;

  return (
    <div className="card relative flex flex-col" style={{ padding: '18px' }}>
      {/* Ícones de ação — canto superior direito */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <Link to={`/leads/${lead.id}`} title="Editar" className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}>
          <i className="ti ti-pencil text-[15px]" aria-hidden="true" />
        </Link>
        {podeRemover && (
          <Link to={`/leads/${lead.id}?descartar=1`} title="Remover" className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}>
            <i className="ti ti-trash text-[15px]" aria-hidden="true" />
          </Link>
        )}
      </div>

      <Link to={`/leads/${lead.id}`} className="pr-12" style={{ textDecoration: 'none' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold" style={{ color: 'var(--text)' }}>{lead.nome}</p>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <BadgeStatus status={lead.descartado ? 'descartado' : lead.status} showTemp />
          {lead.aguardandoDistribuicao && !lead.descartado && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(var(--amber-rgb), 0.14)', color: 'var(--amber)' }}
              title="Fora da janela de atendimento ou sem corretor presente — será distribuído automaticamente"
            >
              <i className="ti ti-clock-pause text-[12px]" aria-hidden="true" />
              Aguardando distribuição
            </span>
          )}
        </div>
        <p className="text-sm font-semibold mt-2.5" style={{ color: 'var(--accent)' }}>
          {lead.empreendimento || '—'}
        </p>
      </Link>

      <div className="mt-3 space-y-1.5 flex-1">
        {lead.telefone && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <i className="ti ti-phone text-[14px] flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{lead.telefone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <i className="ti ti-mail text-[14px] flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.corretorNome && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-faint)' }}>
            <i className="ti ti-user text-[14px] flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{lead.corretorNome}</span>
          </div>
        )}
      </div>

      {lead.telefone && (
        <a
          href={`https://wa.me/${numeroWhatsapp(lead.telefone)}`}
          target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors"
          style={{ background: 'rgba(var(--success-rgb), 0.12)', color: 'var(--success)', borderRadius: '999px', textDecoration: 'none' }}
        >
          <i className="ti ti-brand-whatsapp text-[16px]" aria-hidden="true" />
          WhatsApp
        </a>
      )}
    </div>
  );
}
