import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { conectarSocket } from '../services/socket';
import api from '../services/api';
import BadgeStatus from '../components/BadgeStatus';

function iniciais(nome) {
  return nome?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?';
}

const CARDS_EQUIPE = [
  { label: 'Tentando Contato', key: 'tentando_contato', cor: '#4a6fa5' },
  { label: 'Meeting / Visita',  key: '_visita',          cor: '#E67C22' },
  { label: 'Proposta',          key: 'proposta',         cor: '#E74C3C' },
  { label: 'Vendas',            key: 'venda_finalizada', cor: '#2ECC71' },
];

const DIAS_ESFRIAR = 7;

export default function Dashboard() {
  const { usuario } = useAuth();
  const { modoSolo } = useConfig();

  const [leads, setLeads] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [presenca, setPresenca] = useState(false);
  const [fila, setFila] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  useEffect(() => {
    carregarDados();
    const socket = conectarSocket();
    socket.on('lead_novo',        (lead) => setLeads((prev) => [lead, ...prev]));
    socket.on('lead_atualizado',  (lead) => setLeads((prev) => prev.map((l) => l.id === lead.id ? lead : l)));
    socket.on('sorteio_realizado', () => carregarFila());
    return () => {
      socket.off('lead_novo');
      socket.off('lead_atualizado');
      socket.off('sorteio_realizado');
    };
  }, []);

  // Carrega visitas para o dashboard solo
  useEffect(() => {
    if (modoSolo) {
      api.get('/visitas').then((r) => setVisitas(r.data)).catch(() => {});
    }
  }, [modoSolo]);

  async function carregarDados() {
    const [leadsRes, filaRes] = await Promise.all([
      api.get('/leads').catch(() => ({ data: [] })),
      api.get('/sorteio/fila').catch(() => ({ data: null })),
    ]);
    setLeads(leadsRes.data);
    setFila(filaRes.data?.ordem ? filaRes.data : null);
  }

  async function carregarFila() {
    const res = await api.get('/sorteio/fila').catch(() => ({ data: null }));
    setFila(res.data?.ordem ? res.data : null);
  }

  async function togglePresenca() {
    setCheckInLoading(true);
    try {
      if (presenca) { await api.post('/sorteio/checkout'); setPresenca(false); }
      else          { await api.post('/sorteio/checkin');  setPresenca(true);  }
    } finally { setCheckInLoading(false); }
  }

  // ── Computações ───────────────────────────────────────────────
  const limite = new Date(Date.now() - DIAS_ESFRIAR * 86400000);

  const contagem = {
    tentando_contato: leads.filter((l) => l.status === 'tentando_contato').length,
    _visita:          leads.filter((l) => ['meeting_agendado', 'visita_agendada'].includes(l.status)).length,
    proposta:         leads.filter((l) => l.status === 'proposta').length,
    venda_finalizada: leads.filter((l) => l.status === 'venda_finalizada').length,
  };

  const leadsAtivos      = leads.filter((l) => !l.descartado && l.status !== 'venda_finalizada');
  const leadsEsfriando   = leadsAtivos.filter((l) => new Date(l.atualizadoEm || l.criadoEm) < limite);
  const leadsRecentes    = [...leads].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, 5);

  const hoje    = new Date().toISOString().split('T')[0];
  const em7dias = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const proximasVisitas = visitas
    .filter((v) => v.data >= hoje && v.data <= em7dias)
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .slice(0, 4);

  const CARDS_SOLO = [
    { label: 'Carteira ativa',   value: leadsAtivos.length,      cor: '#F4F4F8'  },
    { label: 'Em negociação',    value: contagem.proposta + contagem._visita, cor: '#E67C22' },
    { label: 'Esfriando',        value: leadsEsfriando.length,   cor: leadsEsfriando.length > 0 ? '#E74C3C' : '#3A3A42' },
    { label: 'Vendas',           value: contagem.venda_finalizada, cor: '#2ECC71' },
  ];

  // ── Render ────────────────────────────────────────────────────
  if (modoSolo) return <DashboardSolo
    usuario={usuario}
    cards={CARDS_SOLO}
    leadsEsfriando={leadsEsfriando}
    proximasVisitas={proximasVisitas}
    leadsRecentes={leadsRecentes}
  />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>
            Olá, {usuario?.nome?.split(' ')[0]}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#6A6A70' }}>Resumo de hoje</p>
        </div>
        {usuario?.perfil === 'corretor' && (
          <button
            onClick={togglePresenca}
            disabled={checkInLoading}
            style={{
              minHeight: '44px', borderRadius: '2px',
              ...(presenca
                ? { background: '#C0392B', color: '#fff', border: 'none' }
                : { background: 'transparent', color: '#C0392B', border: '1px solid rgba(192,57,43,0.4)' }),
            }}
            className="flex items-center gap-2 px-5 font-semibold text-sm transition-all"
          >
            <span className={`w-2 h-2 rounded-full ${presenca ? 'animate-pulse' : ''}`}
              style={{ background: presenca ? '#fff' : '#C0392B' }} />
            {checkInLoading ? '...' : presenca ? 'Disponível' : 'Marcar presença'}
          </button>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CARDS_EQUIPE.map((c) => (
          <div key={c.key} className="card">
            <p className="metric-label">{c.label}</p>
            <p className="metric-number mt-1" style={{ color: c.cor }}>{contagem[c.key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Fila do sorteio */}
      {fila && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#F4F4F8' }}>
              <i className="ti ti-arrows-sort text-[16px]" style={{ color: '#3A3A42' }} aria-hidden="true" />
              Fila do sorteio
            </h2>
            <span className="text-[11px] font-medium capitalize px-2.5 py-1 rounded"
              style={{ color: '#4A4A52', background: '#141418' }}>
              {fila.periodo}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const pos = fila.posicaoAtual % fila.ordem.length;
              return [...fila.ordem.slice(pos), ...fila.ordem.slice(0, pos)].map((c, i) => {
                const isProximo = i === 0;
                return (
                  <div key={c.corretorId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={isProximo ? { background: '#C0392B', color: '#fff' } : { background: '#141418', color: '#6A6A70' }}
                  >
                    <span className="text-xs opacity-60">#{i + 1}</span>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={isProximo ? { background: 'rgba(255,255,255,0.2)', color: '#fff' } : { background: '#1E1E24', color: '#6A6A70' }}>
                      {iniciais(c.corretorNome)}
                    </span>
                    {c.corretorNome.split(' ')[0]}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Leads recentes */}
      <LeadsRecentesCard leads={leadsRecentes} />
    </div>
  );
}

// ── Dashboard Solo ────────────────────────────────────────────
function DashboardSolo({ usuario, cards, leadsEsfriando, proximasVisitas, leadsRecentes }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>
          {usuario?.nome?.split(' ')[0]}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#6A6A70' }}>Minha carteira</p>
      </div>

      {/* Métricas solo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="metric-label">{c.label}</p>
            <p className="metric-number mt-1" style={{ color: c.cor }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Leads esfriando */}
      {leadsEsfriando.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(244,244,248,0.06)', background: 'rgba(192,57,43,0.04)' }}>
            <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#E74C3C' }}>
              <i className="ti ti-flame-off text-[16px]" aria-hidden="true" />
              Esfriando ({leadsEsfriando.length})
            </h2>
            <span className="text-xs" style={{ color: '#4A4A52' }}>sem atividade há +{7} dias</span>
          </div>
          {leadsEsfriando.slice(0, 4).map((lead) => (
            <Link to={`/leads/${lead.id}`} key={lead.id}
              className="flex items-center justify-between px-5 py-3 transition-colors"
              style={{ borderBottom: '1px solid rgba(244,244,248,0.04)', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,244,248,0.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-semibold text-sm truncate" style={{ color: '#F4F4F8' }}>{lead.nome}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: '#3A3A42' }}>{lead.empreendimento}</p>
              </div>
              <BadgeStatus status={lead.status} />
            </Link>
          ))}
          {leadsEsfriando.length > 4 && (
            <Link to="/leads" className="block text-center py-3 text-xs font-medium"
              style={{ color: '#E74C3C', textDecoration: 'none' }}>
              Ver todos {leadsEsfriando.length} esfriando →
            </Link>
          )}
        </div>
      )}

      {/* Próximas visitas */}
      {proximasVisitas.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(244,244,248,0.06)' }}>
            <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#F4F4F8' }}>
              <i className="ti ti-calendar-event text-[16px]" style={{ color: '#3A3A42' }} aria-hidden="true" />
              Próximas visitas
            </h2>
            <Link to="/visitas" className="text-xs font-semibold" style={{ color: '#C0392B', textDecoration: 'none' }}>
              Ver todas →
            </Link>
          </div>
          {proximasVisitas.map((v) => (
            <div key={v.id} className="flex items-center gap-4 px-5 py-3"
              style={{ borderBottom: '1px solid rgba(244,244,248,0.04)' }}>
              <div className="text-center min-w-[40px]" style={{ color: '#E74C3C' }}>
                <p className="text-lg font-black leading-none">
                  {new Date(v.data + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
                </p>
                <p className="text-[10px] uppercase">
                  {new Date(v.data + 'T00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#F4F4F8' }}>{v.empreendimento}</p>
                <p className="text-xs truncate" style={{ color: '#3A3A42' }}>{v.hora} · {v.leadNome}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leads recentes */}
      <LeadsRecentesCard leads={leadsRecentes} />
    </div>
  );
}

function LeadsRecentesCard({ leads }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(244,244,248,0.06)' }}>
        <h2 className="font-semibold text-sm" style={{ color: '#F4F4F8' }}>Leads recentes</h2>
        <Link to="/leads" className="text-sm font-semibold" style={{ color: '#C0392B', textDecoration: 'none' }}>
          Ver todos <i className="ti ti-arrow-right text-[13px]" aria-hidden="true" />
        </Link>
      </div>
      {leads.length === 0 ? (
        <div className="text-center py-10">
          <i className="ti ti-inbox text-[32px]" style={{ color: '#1E1E24' }} aria-hidden="true" />
          <p className="text-sm mt-2" style={{ color: '#3A3A42' }}>Nenhum lead ainda.</p>
        </div>
      ) : (
        <div>
          {leads.map((lead) => (
            <Link to={`/leads/${lead.id}`} key={lead.id}
              className="flex items-center justify-between px-5 py-3.5 transition-colors"
              style={{ minHeight: '56px', borderBottom: '1px solid rgba(244,244,248,0.04)', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,244,248,0.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-semibold text-sm truncate" style={{ color: '#F4F4F8' }}>{lead.nome}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: '#3A3A42' }}>{lead.empreendimento}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs hidden sm:block" style={{ color: '#3A3A42' }}>
                  {lead.corretorNome?.split(' ')[0] || '—'}
                </span>
                <BadgeStatus status={lead.descartado ? 'descartado' : lead.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
