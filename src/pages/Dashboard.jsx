import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { conectarSocket } from '../services/socket';
import api from '../services/api';
import BadgeStatus from '../components/BadgeStatus';
import { GraficoFunil, GraficoOrigem } from '../components/DashboardCharts';
import { dentroDaJanelaCheckin, checkinAindaNaoAbriu } from '../utils/janelaFila';

function iniciais(nome) {
  return nome?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?';
}

const CARDS_EQUIPE = [
  { label: 'Tentando Contato', key: 'tentando_contato', cor: 'var(--blue)' },
  { label: 'Meeting / Visita',  key: '_visita',          cor: 'var(--warning)' },
  { label: 'Proposta',          key: 'proposta',         cor: 'var(--accent-hover)' },
  { label: 'Vendas',            key: 'venda_finalizada', cor: 'var(--success)' },
];

const DIAS_ESFRIAR = 7;

function fmtHora(iso) {
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}

// Botão de presença — fila fechada com janela: só dá pra bater ponto
// 09:00-09:59 Brasília, e bater ponto NÃO distribui lead na hora (só
// marca presença — a fila fecha e é sorteada às 10h, ver tela "Fila").
// Fora da janela, vira uma pílula informativa (não clicável) com mensagem
// clara — o backend sempre revalida de qualquer forma, isso aqui é só UX.
function BotaoPresenca({ presencaInfo, loading, onToggle }) {
  const [hover, setHover] = useState(false);
  const presente = Boolean(presencaInfo);
  const podeClicar = dentroDaJanelaCheckin();

  if (!podeClicar) {
    const mensagem = presente
      ? `Na fila · desde ${fmtHora(presencaInfo.horaCheckIn)}`
      : (checkinAindaNaoAbriu() ? 'Check-in abre às 09:00' : 'Check-in encerrado às 09:59');
    const titulo = presente
      ? 'A fila de hoje já fechou — fale com o administrador pra sair.'
      : (checkinAindaNaoAbriu() ? 'Check-in abre às 09:00.' : 'Check-in encerrado às 09:59. Fale com o administrador.');
    const estiloInfo = presente
      ? { background: 'rgba(var(--success-rgb), 0.12)', color: 'var(--success)', border: '1px solid rgba(var(--success-rgb), 0.25)' }
      : { background: 'var(--surface-2)', color: 'var(--text-faint)', border: '1px solid var(--border-color)' };
    return (
      <span
        title={titulo}
        style={{ height: '32px', borderRadius: '999px', ...estiloInfo, cursor: 'default' }}
        className="inline-flex items-center gap-1.5 px-3 font-medium text-xs whitespace-nowrap"
      >
        <i className={`ti ${presente ? 'ti-circle-check' : 'ti-lock'} text-[14px] flex-shrink-0`} aria-hidden="true" />
        {mensagem}
      </span>
    );
  }

  const estilo = presente
    ? { background: 'rgba(var(--success-rgb), 0.12)', color: 'var(--success)', border: '1px solid rgba(var(--success-rgb), 0.25)' }
    : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-color)' };

  let texto;
  if (loading) texto = 'Atualizando...';
  else if (presente) texto = hover ? 'Sair da fila' : `Na fila · desde ${fmtHora(presencaInfo.horaCheckIn)}`;
  else texto = 'Entrar na fila';

  return (
    <button
      onClick={onToggle}
      disabled={loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ height: '32px', borderRadius: '999px', ...estilo, transition: 'background-color 0.15s, color 0.15s, border-color 0.15s' }}
      className="inline-flex items-center gap-1.5 px-3 font-medium text-xs whitespace-nowrap"
    >
      <i className={`ti ${presente ? (hover ? 'ti-logout' : 'ti-circle-check') : 'ti-clock'} text-[14px] flex-shrink-0`} aria-hidden="true" />
      {texto}
    </button>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const { modoSolo } = useConfig();

  const [leads, setLeads] = useState([]);
  const [visitas, setVisitas] = useState([]);
  // null = ausente; { horaCheckIn } = presente — guarda a hora real do
  // check-in pro rótulo "Na fila · desde HH:MM" (item 1 do ajuste).
  const [presencaInfo, setPresencaInfo] = useState(null);
  const [fila, setFila] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [presencaErro, setPresencaErro] = useState('');

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
      api.get('/sorteio/fila-do-dia').catch(() => ({ data: null })),
    ]);
    setLeads(leadsRes.data);
    setFila(filaRes.data?.ordem?.length ? filaRes.data : null);
  }

  // Bug corrigido: presença era só useState local (sempre false no F5,
  // mesmo com check-in persistido no Firestore). Lê o estado real ao montar,
  // guardando a hora real do check-in (não só um booleano).
  useEffect(() => {
    if (usuario?.perfil !== 'corretor') return;
    api.get('/sorteio/presencas')
      .then((r) => {
        const minha = r.data.find((p) => p.corretorId === usuario.id);
        setPresencaInfo(minha ? { horaCheckIn: minha.horaCheckIn } : null);
      })
      .catch(() => {});
  }, [usuario?.id, usuario?.perfil]);

  async function carregarFila() {
    const res = await api.get('/sorteio/fila-do-dia').catch(() => ({ data: null }));
    setFila(res.data?.ordem?.length ? res.data : null);
  }

  async function togglePresenca() {
    setCheckInLoading(true);
    setPresencaErro('');
    try {
      if (presencaInfo) {
        await api.post('/sorteio/checkout');
        setPresencaInfo(null);
      } else {
        const res = await api.post('/sorteio/checkin');
        setPresencaInfo({ horaCheckIn: res.data.presenca?.horaCheckIn || new Date().toISOString() });
      }
    } catch (e) {
      // Botão já fica desabilitado fora da janela — isso só cobre o caso
      // raro de o relógio do navegador estar dessincronizado ou a janela
      // ter fechado bem no instante do clique.
      setPresencaErro(e.response?.data?.erro || 'Não foi possível atualizar sua presença.');
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
    { label: 'Carteira ativa',   value: leadsAtivos.length,      cor: 'var(--text)'  },
    { label: 'Em negociação',    value: contagem.proposta + contagem._visita, cor: 'var(--warning)' },
    { label: 'Esfriando',        value: leadsEsfriando.length,   cor: leadsEsfriando.length > 0 ? 'var(--accent-hover)' : 'var(--text-muted)' },
    { label: 'Vendas',           value: contagem.venda_finalizada, cor: 'var(--success)' },
  ];

  // ── Render ────────────────────────────────────────────────────
  if (modoSolo) return <DashboardSolo
    usuario={usuario}
    cards={CARDS_SOLO}
    leads={leadsAtivos}
    leadsEsfriando={leadsEsfriando}
    proximasVisitas={proximasVisitas}
    leadsRecentes={leadsRecentes}
  />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Olá, {usuario?.nome?.split(' ')[0]}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Resumo de hoje</p>
        </div>
        {usuario?.perfil === 'corretor' && (
          <div className="flex flex-col items-end gap-1">
            <BotaoPresenca presencaInfo={presencaInfo} loading={checkInLoading} onToggle={togglePresenca} />
            {presencaErro && (
              <p className="text-xs" style={{ color: 'var(--accent-hover)' }}>{presencaErro}</p>
            )}
          </div>
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

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-3">
        <GraficoFunil leads={leads} />
        <GraficoOrigem leads={leads} />
      </div>

      {/* Fila do dia — sorteada às 10h, ordem já vem física (fila.ordem[0]
          é sempre o próximo, sem cálculo de rotação aqui). */}
      {fila && (
        <div className="card-alt">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <i className="ti ti-arrows-sort text-[16px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              Fila de hoje
            </h2>
            <Link to="/operador" className="text-[11px] font-medium px-2.5 py-1 rounded transition-colors"
              style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
              Ver tudo
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {fila.ordem.map((c, i) => (
              <div key={c.corretorId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style={c.proximo ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
              >
                <span className="text-xs opacity-60">#{i + 1}</span>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={c.proximo ? { background: 'rgba(255,255,255,0.2)', color: '#fff' } : { background: 'var(--text-faint)', color: 'var(--text-tertiary)' }}>
                  {iniciais(c.corretorNome)}
                </span>
                {c.corretorNome.split(' ')[0]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leads recentes */}
      <LeadsRecentesCard leads={leadsRecentes} />
    </div>
  );
}

// ── Dashboard Solo ────────────────────────────────────────────
function DashboardSolo({ usuario, cards, leads, leadsEsfriando, proximasVisitas, leadsRecentes }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          {usuario?.nome?.split(' ')[0]}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Minha carteira</p>
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

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-3">
        <GraficoFunil leads={leads} />
        <GraficoOrigem leads={leads} />
      </div>

      {/* Leads esfriando */}
      {leadsEsfriando.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', background: 'rgba(var(--accent-rgb), 0.04)' }}>
            <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--accent-hover)' }}>
              <i className="ti ti-flame-off text-[16px]" aria-hidden="true" />
              Esfriando ({leadsEsfriando.length})
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>sem atividade há +{7} dias</span>
          </div>
          {leadsEsfriando.slice(0, 4).map((lead) => (
            <Link to={`/leads/${lead.id}`} key={lead.id}
              className="flex items-center justify-between px-5 py-3 transition-colors"
              style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{lead.nome}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{lead.empreendimento}</p>
              </div>
              <BadgeStatus status={lead.status} />
            </Link>
          ))}
          {leadsEsfriando.length > 4 && (
            <Link to="/leads" className="block text-center py-3 text-xs font-medium"
              style={{ color: 'var(--accent-hover)', textDecoration: 'none' }}>
              Ver todos {leadsEsfriando.length} esfriando →
            </Link>
          )}
        </div>
      )}

      {/* Próximas visitas */}
      {proximasVisitas.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
            <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <i className="ti ti-calendar-event text-[16px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              Próximas visitas
            </h2>
            <Link to="/visitas" className="text-xs font-semibold" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Ver todas →
            </Link>
          </div>
          {proximasVisitas.map((v) => (
            <div key={v.id} className="flex items-center gap-4 px-5 py-3"
              style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)' }}>
              <div className="text-center min-w-[40px]" style={{ color: 'var(--accent-hover)' }}>
                <p className="text-lg font-black leading-none">
                  {new Date(v.data + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
                </p>
                <p className="text-[10px] uppercase">
                  {new Date(v.data + 'T00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{v.empreendimento}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{v.hora} · {v.leadNome}</p>
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
        style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Leads recentes</h2>
        <Link to="/leads" className="text-sm font-semibold" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          Ver todos <i className="ti ti-arrow-right text-[13px]" aria-hidden="true" />
        </Link>
      </div>
      {leads.length === 0 ? (
        <div className="text-center py-10">
          <i className="ti ti-inbox text-[32px]" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Nenhum lead ainda.</p>
        </div>
      ) : (
        <div>
          {leads.map((lead) => (
            <Link to={`/leads/${lead.id}`} key={lead.id}
              className="flex items-center justify-between px-5 py-3.5 transition-colors"
              style={{ minHeight: '56px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{lead.nome}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{lead.empreendimento}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
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
