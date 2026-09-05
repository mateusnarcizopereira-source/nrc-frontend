import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Categorias de evento (ajuste Fase 1, item 7) — mesma paleta de cores usada
// nos badges de status (item 3). Visitas cadastradas viram categoria "visita";
// tarefas usam o próprio tipo já existente (Ligar/WhatsApp/E-mail/Visita/Outro).
const CATEGORIA = {
  visita:   { label: 'Visita',    icon: 'map-pin',        cor: 'var(--purple)', corRgb: 'var(--purple-rgb)' },
  Visita:   { label: 'Visita',    icon: 'map-pin',        cor: 'var(--purple)', corRgb: 'var(--purple-rgb)' },
  Ligar:    { label: 'Ligação',   icon: 'phone',          cor: 'var(--blue)',   corRgb: 'var(--blue-rgb)' },
  WhatsApp: { label: 'WhatsApp',  icon: 'brand-whatsapp', cor: 'var(--success)', corRgb: 'var(--success-rgb)' },
  'E-mail': { label: 'E-mail',    icon: 'mail',           cor: 'var(--amber)',  corRgb: 'var(--amber-rgb)' },
  Outro:    { label: 'Follow-up', icon: 'checkbox',       cor: 'var(--teal)',   corRgb: 'var(--teal-rgb)' },
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function chaveData(d) { return d.toISOString().split('T')[0]; }

export default function Agenda() {
  const { usuario } = useAuth();
  const [mesAtual, setMesAtual] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [visitas, setVisitas] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const rotaVisitas = usuario?.perfil === 'corretor' ? '/visitas/minhas' : '/visitas';
    setCarregando(true);
    Promise.all([
      api.get(rotaVisitas).catch(() => ({ data: [] })),
      api.get('/tarefas', { params: { periodo: 'todas' } }).catch(() => ({ data: [] })),
    ]).then(([v, t]) => {
      setVisitas(v.data);
      setTarefas(t.data.filter((x) => x.dataHora && x.status === 'Pendente'));
    }).finally(() => setCarregando(false));
  }, [usuario?.perfil]);

  // Unifica visitas + tarefas com data numa lista só de "eventos" — não cria
  // fonte de dado nova, só junta o que já existe numa visão de calendário.
  const eventos = useMemo(() => {
    const deVisitas = visitas.map((v) => ({
      id: `v_${v.id}`, data: v.data, hora: v.hora, categoria: 'visita',
      titulo: `Visita — ${v.empreendimento}`, leadNome: v.leadNome, leadId: v.leadId, empreendimento: v.empreendimento,
    }));
    const deTarefas = tarefas.map((t) => {
      const dt = new Date(t.dataHora);
      return {
        id: `t_${t.id}`, data: chaveData(dt),
        hora: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        categoria: t.tipo, titulo: t.titulo, leadNome: t.leadNome, leadId: t.leadId, empreendimento: null,
      };
    });
    return [...deVisitas, ...deTarefas].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  }, [visitas, tarefas]);

  const eventosPorDia = useMemo(() => {
    const mapa = {};
    eventos.forEach((e) => { (mapa[e.data] ||= []).push(e); });
    return mapa;
  }, [eventos]);

  const hoje = chaveData(new Date());
  const proximosEventos = eventos.filter((e) => e.data >= hoje).slice(0, 10);

  // ── Grid do mês ──────────────────────────────────────────────
  const primeiroDiaSemana = mesAtual.getDay(); // 0=domingo
  const diasNoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let dia = 1; dia <= diasNoMes; dia++) celulas.push(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia));

  function mudarMes(delta) {
    setMesAtual((d) => { const novo = new Date(d); novo.setMonth(novo.getMonth() + delta); return novo; });
  }
  function irParaHoje() {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setMesAtual(d);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Agenda</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Visitas e tarefas com data marcada</p>
        </div>
        <button
          disabled
          title="Em breve"
          className="inline-flex items-center gap-2 px-4 text-sm font-semibold cursor-not-allowed"
          style={{ height: '40px', borderRadius: '999px', background: 'var(--surface-2)', color: 'var(--text-faint)', border: '1px solid var(--border-color)' }}
        >
          <GoogleIcon />
          Conectar Google Calendar
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        {/* Calendário */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h2 className="font-semibold text-base capitalize" style={{ color: 'var(--text)' }}>
              {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => mudarMes(-1)} className="p-2 rounded transition-colors" style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                <i className="ti ti-chevron-left text-[18px]" aria-hidden="true" />
              </button>
              <button onClick={irParaHoje} className="px-3 py-1.5 text-xs font-semibold rounded transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                Hoje
              </button>
              <button onClick={() => mudarMes(1)} className="p-2 rounded transition-colors" style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                <i className="ti ti-chevron-right text-[18px]" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border-color)' }}>
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide py-2" style={{ color: 'var(--text-faint)' }}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {celulas.map((data, i) => {
              if (!data) return <div key={i} style={{ minHeight: '84px', background: 'var(--surface-alt)' }} />;
              const chave = chaveData(data);
              const eventosDoDia = eventosPorDia[chave] || [];
              const isHoje = chave === hoje;
              return (
                <div key={i} className="p-1.5 flex flex-col gap-1"
                  style={{ minHeight: '84px', border: '1px solid var(--border-color)', borderWidth: '0 1px 1px 0' }}>
                  <span
                    className="text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
                    style={isHoje ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-tertiary)' }}
                  >
                    {data.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {eventosDoDia.slice(0, 2).map((e) => {
                      const cat = CATEGORIA[e.categoria] || CATEGORIA.Outro;
                      return (
                        <span key={e.id} title={e.titulo}
                          className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium"
                          style={{ background: `rgba(${cat.corRgb}, 0.15)`, color: cat.cor }}>
                          {e.hora} {e.leadNome?.split(' ')[0] || cat.label}
                        </span>
                      );
                    })}
                    {eventosDoDia.length > 2 && (
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>
                        +{eventosDoDia.length - 2} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Próximos eventos */}
        <div className="card-alt p-0 overflow-hidden">
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Próximos Eventos</h2>
          </div>
          {carregando ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
          ) : proximosEventos.length === 0 ? (
            <p className="text-sm text-center py-8 px-4" style={{ color: 'var(--text-muted)' }}>Nenhum evento futuro.</p>
          ) : (
            <div>
              {proximosEventos.map((e) => {
                const cat = CATEGORIA[e.categoria] || CATEGORIA.Outro;
                const conteudo = (
                  <div className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex flex-col items-center flex-shrink-0 w-9 pt-0.5">
                      <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-faint)' }}>
                        {new Date(e.data + 'T00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold leading-none" style={{ color: 'var(--text)' }}>
                        {new Date(e.data + 'T00:00').getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <i className={`ti ti-${cat.icon} text-[13px] flex-shrink-0`} style={{ color: cat.cor }} aria-hidden="true" />
                        <span className="text-[11px] font-semibold" style={{ color: cat.cor }}>{cat.label}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>· {e.hora}</span>
                      </div>
                      <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--text)' }}>{e.leadNome || e.titulo}</p>
                      {e.empreendimento && (
                        <p className="text-xs truncate" style={{ color: 'var(--accent)' }}>{e.empreendimento}</p>
                      )}
                    </div>
                  </div>
                );
                return e.leadId
                  ? <Link key={e.id} to={`/leads/${e.leadId}`} style={{ textDecoration: 'none' }}
                      className="block transition-colors"
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.02)')}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = 'none')}>
                      {conteudo}
                    </Link>
                  : <div key={e.id}>{conteudo}</div>;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.2-5.6l-6.6-5.4c-2 1.5-4.6 2.5-7.6 2.5-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.6 5.4C41.5 35.9 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}
