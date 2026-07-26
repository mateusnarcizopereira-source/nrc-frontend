import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import BadgeStatus from '../components/BadgeStatus';
import SeletorEmpreendimento from '../components/SeletorEmpreendimento';

const TEMPERATURA_OPCOES = [
  { value: 'tentando_contato', label: 'Tentando Contato', temp: 'FRIO'       },
  { value: 'material_enviado', label: 'Material Enviado', temp: 'MEIO-MORNO' },
  { value: 'sem_resposta',     label: 'Sem Resposta',     temp: 'FRIO'       },
  { value: 'meeting_agendado', label: 'Meeting Agendado', temp: 'MORNO'      },
  { value: 'visita_agendada',  label: 'Visita Agendada',  temp: 'MORNO'      },
  { value: 'proposta',         label: 'Proposta',          temp: 'QUENTE'    },
  { value: 'venda_finalizada', label: 'Venda Finalizada', temp: 'FERVENDO'   },
];

// Perfil de busca (Fase 2) — enums configuráveis
const TIPOLOGIAS       = ['Studio', '1 dorm', '2 dorm', '2 dorm suíte', '3 dorm', '4+ dorm', 'Cobertura'];
const FINALIDADES      = ['Moradia', 'Investimento', 'Não sei'];
const FORMAS_PAGAMENTO = ['À vista', 'Financiamento', 'FGTS + Financiamento', 'Consórcio', 'Não definido'];
const PRAZOS           = ['Imediato', '3 meses', '6 meses', '1 ano', 'Sem prazo'];
const ORIGENS          = ['Meta Lead Ads', 'Indicação', 'Carteira própria', 'Oferta Ativa'];

function fmtMoeda(v) {
  if (v == null || v === '') return null;
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export default function LeadDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, temPerfil } = useAuth();

  const [lead, setLead] = useState(null);
  const [aba, setAba] = useState('timeline');

  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [notas, setNotas] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [visitas, setVisitas] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [visitaForm, setVisitaForm] = useState({ data: '', hora: '', empreendimento: '', comentario: '', gerenteId: '' });
  const [cadastrandoVisita, setCadastrandoVisita] = useState(false);

  const [modalDescarte, setModalDescarte] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [descartando, setDescartando] = useState(false);
  const [motivosDescarte, setMotivosDescarte] = useState([]);

  // Perfil de busca (Fase 2)
  const [perfilAberto, setPerfilAberto] = useState(true);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [perfilForm, setPerfilForm] = useState(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  const isCorretorResponsavel = usuario?.perfil === 'corretor' && lead?.corretorId === usuario?.id;
  const podeEscrever = isCorretorResponsavel;
  // Perfil de busca: corretor responsável ou editor (cobre o Modo Solo); Diretor é só-leitura
  const podeEditarPerfil = isCorretorResponsavel || usuario?.perfil === 'editor';

  useEffect(() => {
    api.get(`/leads/${id}`).then((r) => { setLead(r.data); setNotas(r.data.notas || ''); }).catch(() => navigate('/leads'));
    api.get(`/leads/${id}/comentarios`).then((r) => setComentarios(r.data)).catch(() => {});
    api.get(`/leads/${id}/visitas`).then((r) => setVisitas(r.data)).catch(() => {});
    api.get('/gerentes').then((r) => setGerentes(r.data)).catch(() => {});
    api.get('/motivos-descarte').then((r) => setMotivosDescarte(r.data)).catch(() => {});
    api.get('/empreendimentos', { params: { ativo: 'true' } }).then((r) => setEmpreendimentos(r.data)).catch(() => {});
  }, [id]);

  function abrirEdicaoPerfil() {
    setPerfilForm({
      tipologia: lead.tipologia || '',
      finalidade: lead.finalidade || '',
      formaPagamento: lead.formaPagamento || '',
      prazoCompra: lead.prazoCompra || '',
      origem: lead.origem || '',
      empreendimentoId: lead.empreendimentoId || '',
      faixaValor: { min: lead.faixaValor?.min ?? '', max: lead.faixaValor?.max ?? '' },
    });
    setEditandoPerfil(true);
    setPerfilAberto(true);
  }

  async function salvarPerfil(e) {
    e.preventDefault();
    setSalvandoPerfil(true);
    try {
      const emp = empreendimentos.find((x) => x.id === perfilForm.empreendimentoId);
      const payload = { ...perfilForm };
      if (emp) payload.empreendimento = emp.nome; // mantém texto em sincronia
      const r = await api.patch(`/leads/${id}/perfil`, payload);
      setLead(r.data);
      setEditandoPerfil(false);
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function mudarStatus(status) {
    if (!podeEscrever) return;
    const res = await api.patch(`/leads/${id}/status`, { status });
    setLead(res.data);
  }

  async function salvarNotas() {
    if (!podeEscrever) return;
    setSalvando(true);
    try { await api.patch(`/leads/${id}/notas`, { notas }); }
    finally { setSalvando(false); }
  }

  async function enviarComentario(e) {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    setEnviando(true);
    try {
      const res = await api.post(`/leads/${id}/comentarios`, { texto: novoComentario });
      setComentarios([res.data, ...comentarios]);
      setNovoComentario('');
    } finally { setEnviando(false); }
  }

  async function agendarVisita(e) {
    e.preventDefault();
    if (!podeEscrever) return;
    setCadastrandoVisita(true);
    try {
      const res = await api.post(`/leads/${id}/visitas`, visitaForm);
      setVisitas([res.data, ...visitas]);
      setVisitaForm({ data: '', hora: '', empreendimento: '', comentario: '', gerenteId: '' });
    } finally { setCadastrandoVisita(false); }
  }

  async function confirmarDescarte() {
    if (!motivo) return;
    setDescartando(true);
    try {
      await api.post(`/leads/${id}/descartar`, { motivo });
      setLead((prev) => ({ ...prev, descartado: true, motivoDescarte: motivo }));
      setModalDescarte(false);
    } finally { setDescartando(false); }
  }

  if (!lead) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const telLimpo = lead.telefone?.replace(/\D/g, '');

  const divider = { borderBottom: '1px solid rgba(244,244,248,0.06)' };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Voltar */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm transition-colors"
        style={{ color: '#4A4A52' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#A0A0A8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#4A4A52')}
      >
        <i className="ti ti-arrow-left text-[16px]" aria-hidden="true" />
        Voltar
      </button>

      {/* Cabeçalho */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#F4F4F8' }}>{lead.nome}</h1>
            <p className="font-semibold text-sm mt-1" style={{ color: '#C0392B' }}>{lead.empreendimento}</p>
            <p className="text-xs mt-1" style={{ color: '#2A2A32' }}>
              Entrada: {new Date(lead.criadoEm).toLocaleString('pt-BR')} · Origem: {lead.origem}
            </p>
          </div>
          <BadgeStatus status={lead.descartado ? 'descartado' : lead.status} showTemp />
        </div>

        {/* Ações rápidas */}
        {!lead.descartado && (
          <div className="flex gap-2 mt-4 flex-wrap">
            <a href={`tel:${telLimpo}`} className="btn-primary text-sm px-4" style={{ minHeight: '40px' }}>
              <i className="ti ti-phone text-[16px]" aria-hidden="true" />
              Ligar
            </a>
            <a
              href={`https://wa.me/55${telLimpo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 text-sm font-semibold transition-colors"
              style={{
                minHeight: '40px',
                background: '#1a3a22',
                color: '#2ECC71',
                border: '1px solid rgba(46,204,113,0.3)',
                borderRadius: '2px',
                textDecoration: 'none',
              }}
            >
              <i className="ti ti-brand-whatsapp text-[16px]" aria-hidden="true" />
              WhatsApp
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-2 px-4 text-sm font-semibold transition-colors"
                style={{
                  minHeight: '40px',
                  background: '#141418',
                  color: '#A0A0A8',
                  border: '1px solid rgba(244,244,248,0.12)',
                  borderRadius: '2px',
                  textDecoration: 'none',
                }}
              >
                <i className="ti ti-mail text-[16px]" aria-hidden="true" />
                E-mail
              </a>
            )}
          </div>
        )}

        {lead.descartado && (
          <div className="mt-4 p-3 rounded" style={{ background: '#0A0A0C', border: '1px solid rgba(244,244,248,0.05)' }}>
            <p className="text-sm font-medium" style={{ color: '#6A6A70' }}>Marcado como Não Cliente</p>
            <p className="text-xs mt-0.5" style={{ color: '#3A3A42' }}>Motivo: {lead.motivoDescarte}</p>
            {lead.descartadoPorNome && (
              <p className="text-xs mt-0.5" style={{ color: '#2A2A30' }}>
                Por {lead.descartadoPorNome} · {lead.descartadoEm && new Date(lead.descartadoEm).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dados */}
      <div className="card space-y-3">
        <h2 className="font-semibold" style={{ color: '#F4F4F8' }}>Dados do lead</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Telefone', value: lead.telefone },
            { label: 'E-mail', value: lead.email || '—' },
            { label: 'Empreendimento', value: lead.empreendimento },
            { label: 'Origem', value: lead.origem },
            { label: 'Corretor', value: lead.corretorNome || 'Não atribuído' },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide" style={{ color: '#2A2A30' }}>{label}</dt>
              <dd className="font-medium mt-0.5" style={{ color: '#D4D4D8' }}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Perfil de Busca (Fase 2) */}
      {(() => {
        const campos = [
          { label: 'Empreendimento',    valor: lead.empreendimento, preenchido: Boolean(lead.empreendimentoId || lead.empreendimento) },
          { label: 'Tipologia',         valor: lead.tipologia,       preenchido: Boolean(lead.tipologia) },
          { label: 'Faixa de valor',    valor: (lead.faixaValor && (lead.faixaValor.min != null || lead.faixaValor.max != null))
              ? [fmtMoeda(lead.faixaValor.min), fmtMoeda(lead.faixaValor.max)].filter(Boolean).join(' — ')
              : null, preenchido: Boolean(lead.faixaValor && (lead.faixaValor.min != null || lead.faixaValor.max != null)) },
          { label: 'Finalidade',        valor: lead.finalidade,      preenchido: Boolean(lead.finalidade) },
          { label: 'Forma de pagamento', valor: lead.formaPagamento, preenchido: Boolean(lead.formaPagamento) },
          { label: 'Prazo de compra',   valor: lead.prazoCompra,     preenchido: Boolean(lead.prazoCompra) },
          { label: 'Origem',            valor: lead.origem,          preenchido: Boolean(lead.origem) },
        ];
        const total = campos.length;
        const preenchidos = campos.filter((c) => c.preenchido).length;
        const pct = Math.round((preenchidos / total) * 100);

        return (
          <div className="card">
            {/* Cabeçalho recolhível */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setPerfilAberto((v) => !v)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <i className={`ti ti-chevron-${perfilAberto ? 'down' : 'right'} text-[16px]`} style={{ color: '#4A4A52' }} aria-hidden="true" />
                <h2 className="font-semibold" style={{ color: '#F4F4F8' }}>Perfil de Busca</h2>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: preenchidos === total ? 'rgba(39,174,96,0.15)' : 'rgba(244,244,248,0.06)',
                           color: preenchidos === total ? '#27AE60' : '#6A6A70' }}>
                  {preenchidos} de {total}
                </span>
              </button>
              {podeEditarPerfil && !lead.descartado && !editandoPerfil && (
                <button onClick={abrirEdicaoPerfil} className="text-xs px-3 py-1.5 rounded font-medium"
                  style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
                  <i className="ti ti-pencil mr-1" aria-hidden="true" />Editar
                </button>
              )}
            </div>

            {/* Barra de completude */}
            {perfilAberto && (
              <div className="h-1 rounded-full mt-3 mb-1" style={{ background: 'rgba(244,244,248,0.08)' }}>
                <div className="h-1 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: preenchidos === total ? '#27AE60' : '#C0392B' }} />
              </div>
            )}

            {/* Corpo */}
            {perfilAberto && !editandoPerfil && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3">
                {campos.map((c) => (
                  <div key={c.label}>
                    <dt className="text-xs uppercase tracking-wide" style={{ color: '#2A2A30' }}>{c.label}</dt>
                    <dd className="font-medium mt-0.5">
                      {c.preenchido ? (
                        <span style={{ color: '#D4D4D8' }}>{c.valor}</span>
                      ) : podeEditarPerfil && !lead.descartado ? (
                        <button onClick={abrirEdicaoPerfil} style={{ color: '#4A4A52' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#C0392B')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#4A4A52')}>
                          — <span className="text-xs">adicionar</span>
                        </button>
                      ) : (
                        <span style={{ color: '#2A2A30' }}>—</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {/* Edição */}
            {perfilAberto && editandoPerfil && (
              <form onSubmit={salvarPerfil} className="space-y-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Empreendimento</label>
                    <select className="input" value={perfilForm.empreendimentoId}
                      onChange={(e) => setPerfilForm({ ...perfilForm, empreendimentoId: e.target.value })}>
                      <option value="">—</option>
                      {empreendimentos.map((emp) => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Tipologia</label>
                    <select className="input" value={perfilForm.tipologia}
                      onChange={(e) => setPerfilForm({ ...perfilForm, tipologia: e.target.value })}>
                      <option value="">—</option>
                      {TIPOLOGIAS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Faixa de valor (R$)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" className="input" placeholder="Mínimo" value={perfilForm.faixaValor.min}
                      onChange={(e) => setPerfilForm({ ...perfilForm, faixaValor: { ...perfilForm.faixaValor, min: e.target.value } })} />
                    <input type="number" className="input" placeholder="Máximo" value={perfilForm.faixaValor.max}
                      onChange={(e) => setPerfilForm({ ...perfilForm, faixaValor: { ...perfilForm.faixaValor, max: e.target.value } })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Finalidade</label>
                    <select className="input" value={perfilForm.finalidade}
                      onChange={(e) => setPerfilForm({ ...perfilForm, finalidade: e.target.value })}>
                      <option value="">—</option>
                      {FINALIDADES.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Forma de pagamento</label>
                    <select className="input" value={perfilForm.formaPagamento}
                      onChange={(e) => setPerfilForm({ ...perfilForm, formaPagamento: e.target.value })}>
                      <option value="">—</option>
                      {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Prazo de compra</label>
                    <select className="input" value={perfilForm.prazoCompra}
                      onChange={(e) => setPerfilForm({ ...perfilForm, prazoCompra: e.target.value })}>
                      <option value="">—</option>
                      {PRAZOS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Origem</label>
                    <select className="input" value={perfilForm.origem}
                      onChange={(e) => setPerfilForm({ ...perfilForm, origem: e.target.value })}>
                      <option value="">—</option>
                      {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setEditandoPerfil(false)}
                    className="flex-1 text-sm py-2 rounded font-medium"
                    style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={salvandoPerfil} className="flex-1 btn-primary">
                    {salvandoPerfil ? 'Salvando...' : 'Salvar perfil'}
                  </button>
                </div>
              </form>
            )}
          </div>
        );
      })()}

      {/* Seletor de temperatura */}
      {podeEscrever && !lead.descartado && (
        <div className="card">
          <h2 className="font-semibold mb-3" style={{ color: '#F4F4F8' }}>Temperatura do lead</h2>
          <div className="flex flex-wrap gap-2">
            {TEMPERATURA_OPCOES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => mudarStatus(opt.value)}
                className="flex flex-col items-start px-3 py-2 text-xs font-medium transition-all"
                style={{
                  borderRadius: '2px',
                  border: '1px solid',
                  ...(lead.status === opt.value
                    ? { borderColor: '#C0392B', background: 'rgba(192,57,43,0.12)', color: '#E74C3C' }
                    : { borderColor: 'rgba(244,244,248,0.10)', background: 'transparent', color: '#4A4A52' }),
                }}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] mt-0.5" style={{ opacity: 0.4 }}>{opt.temp}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="card p-0 overflow-hidden">
        <div className="flex" style={divider}>
          {[
            { key: 'timeline', label: `Timeline (${comentarios.length})` },
            { key: 'visitas',  label: `Visitas (${visitas.length})`       },
            ...(podeEscrever ? [{ key: 'notas', label: 'Notas' }] : []),
          ].map((a) => (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              className="flex-1 py-3 text-sm font-medium transition-colors"
              style={{
                borderBottom: '2px solid',
                ...(aba === a.key
                  ? { borderColor: '#C0392B', color: '#C0392B' }
                  : { borderColor: 'transparent', color: '#4A4A52' }),
              }}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Aba Timeline */}
          {aba === 'timeline' && (
            <div>
              <form onSubmit={enviarComentario} className="flex gap-2 mb-5">
                <input
                  className="input flex-1"
                  placeholder="Ex: Liguei, não atendeu. / Agendou visita para dia 25..."
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                />
                <button type="submit" disabled={enviando || !novoComentario.trim()} className="btn-primary whitespace-nowrap">
                  {enviando ? '...' : 'Registrar'}
                </button>
              </form>

              {comentarios.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#2A2A30' }}>Nenhuma interação registrada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {comentarios.map((c, i) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#C0392B' }} />
                        {i < comentarios.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ background: 'rgba(244,244,248,0.06)' }} />
                        )}
                      </div>
                      <div className="pb-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: '#A0A0A8' }}>{c.autorNome}</span>
                          <span className="text-xs" style={{ color: '#2A2A30' }}>
                            {new Date(c.criadoEm).toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: '#D4D4D8' }}>{c.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba Visitas */}
          {aba === 'visitas' && (
            <div className="space-y-4">
              {podeEscrever && !lead.descartado && (
                <form
                  onSubmit={agendarVisita}
                  className="space-y-3 p-4 rounded"
                  style={{ background: '#0A0A0C', border: '1px solid rgba(244,244,248,0.05)' }}
                >
                  <p className="text-sm font-semibold" style={{ color: '#A0A0A8' }}>Agendar visita</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Data</label>
                      <input type="date" className="input" value={visitaForm.data} onChange={(e) => setVisitaForm({ ...visitaForm, data: e.target.value })} required />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Horário</label>
                      <input type="time" className="input" value={visitaForm.hora} onChange={(e) => setVisitaForm({ ...visitaForm, hora: e.target.value })} required />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Empreendimento</label>
                    <SeletorEmpreendimento
                      value={visitaForm.empreendimento}
                      onChange={(nome) => setVisitaForm({ ...visitaForm, empreendimento: nome })}
                      podeCriar={['gerente', 'editor'].includes(usuario?.perfil)}
                      placeholder="Buscar ou digitar empreendimento..."
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Gerente da visita</label>
                    <select className="input" value={visitaForm.gerenteId} onChange={(e) => setVisitaForm({ ...visitaForm, gerenteId: e.target.value })} required>
                      <option value="">Selecionar gerente...</option>
                      {gerentes.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#4A4A52' }}>Comentário</label>
                    <input className="input" placeholder="Observações da visita..." value={visitaForm.comentario} onChange={(e) => setVisitaForm({ ...visitaForm, comentario: e.target.value })} />
                  </div>
                  <button type="submit" disabled={cadastrandoVisita} className="btn-primary w-full">
                    {cadastrandoVisita ? 'Agendando...' : 'Agendar visita'}
                  </button>
                </form>
              )}

              {visitas.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#2A2A30' }}>Nenhuma visita agendada.</p>
              ) : (
                <div className="space-y-3">
                  {visitas.map((v) => (
                    <div
                      key={v.id}
                      className="flex gap-3 p-3 rounded"
                      style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.15)' }}
                    >
                      <div className="text-center min-w-[48px]">
                        <p className="text-lg font-bold" style={{ color: '#E74C3C' }}>
                          {new Date(v.data + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
                        </p>
                        <p className="text-xs" style={{ color: '#C0392B' }}>
                          {new Date(v.data + 'T00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: '#F4F4F8' }}>{v.empreendimento}</p>
                        <p className="text-xs" style={{ color: '#4A4A52' }}>{v.hora} · Gerente: {v.gerenteNome}</p>
                        {v.comentario && <p className="text-xs mt-1" style={{ color: '#6A6A70' }}>{v.comentario}</p>}
                        {v.calendarioEvento?.modo === 'mock' && (
                          <span className="text-[10px] italic" style={{ color: '#2A2A30' }}>📅 Convite simulado (Google Calendar pendente)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba Notas */}
          {aba === 'notas' && podeEscrever && (
            <div>
              <textarea
                className="input min-h-[140px] resize-y"
                placeholder="Resumo livre sobre este lead — pode editar a qualquer momento..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
              <button onClick={salvarNotas} disabled={salvando} className="btn-primary mt-3">
                {salvando ? 'Salvando...' : 'Salvar notas'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zona de descarte */}
      {podeEscrever && !lead.descartado && (
        <div
          className="card"
          style={{ borderColor: 'rgba(192,57,43,0.25)' }}
        >
          <h2 className="font-semibold mb-2 text-sm" style={{ color: '#E74C3C' }}>Zona de atenção</h2>
          <p className="text-xs mb-3" style={{ color: '#4A4A52' }}>
            Esta ação marca o lead como "Não Cliente" e o remove do funil ativo. É irreversível.
          </p>
          <button
            onClick={() => setModalDescarte(true)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderRadius: '2px',
              border: '1px solid rgba(192,57,43,0.4)',
              color: '#E74C3C',
              background: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(192,57,43,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Marcar como Não Cliente
          </button>
        </div>
      )}

      {/* Modal de descarte */}
      {modalDescarte && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded" style={{ background: '#0D0D0F', border: '1px solid rgba(244,244,248,0.08)' }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#F4F4F8' }}>Marcar como Não Cliente?</h3>
            <p className="text-sm mb-4" style={{ color: '#4A4A52' }}>Escolha o motivo. Esta ação não pode ser desfeita.</p>

            <div className="space-y-2 mb-4">
              {[...motivosDescarte.map((m) => m.texto), 'Outro'].map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
                  style={{
                    borderRadius: '2px',
                    border: '1px solid',
                    ...(motivo === m
                      ? { borderColor: '#C0392B', background: 'rgba(192,57,43,0.08)' }
                      : { borderColor: 'rgba(244,244,248,0.08)', background: 'transparent' }),
                  }}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m}
                    checked={motivo === m}
                    onChange={() => setMotivo(m)}
                    className="accent-[#C0392B]"
                  />
                  <span className="text-sm" style={{ color: '#A0A0A8' }}>{m}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setModalDescarte(false); setMotivo(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  borderRadius: '2px',
                  border: '1px solid rgba(244,244,248,0.12)',
                  color: '#6A6A70',
                  background: 'transparent',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDescarte}
                disabled={!motivo || descartando}
                className="flex-1 btn-primary"
                style={{ flex: 1 }}
              >
                {descartando ? 'Descartando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
