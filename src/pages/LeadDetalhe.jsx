import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useConfig } from '../contexts/ConfigContext';
import BadgeStatus from '../components/BadgeStatus';
import Avatar from '../components/Avatar';
import SeletorEmpreendimento from '../components/SeletorEmpreendimento';
import TarefaCard from '../components/TarefaCard';
import { TarefaFormModal, ConcluirTarefaModal } from '../components/TarefaModais';
import { numeroWhatsapp } from '../utils/whatsapp';
import { textoAlerta, corAlerta } from '../utils/alertaLead';

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

// "há 2 dias" / "há 3h" / "agora mesmo" — pro corretor sentir a urgência de
// bater o olho, sem precisar calcular a data de entrada de cabeça (pedido
// explícito do redesign: lead frio de 3 dias exige urgência diferente de
// um de 10 minutos).
function tempoRelativo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

function fmtDataHora(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

// Full-bleed: escapa do max-w-3xl herdado do Layout (que deixava metade da
// tela vazia à direita) sem tocar em Layout.jsx nem em nenhuma outra
// página — só esta, que realmente precisa da largura pras duas colunas.
// Seguro porque o shell do app (Layout) já usa h-screen overflow-hidden no
// <body> — não existe scrollbar no documento pra 100vw ficar impreciso.
const breakoutStyle = { width: '100vw', marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' };

// Botão "Enviar material" — abre o WhatsApp com o link do arquivo já
// preenchido na mensagem, pro número do próprio lead. Só aparece pro
// corretor dono do lead e só quando o empreendimento já tem material anexado.
function BotaoEnviarMaterial({ lead, telLimpo, materiais, empreendimentoId }) {
  const [aberto, setAberto] = useState(false);

  function linkPara(material) {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    return `${base}/empreendimentos/${empreendimentoId}/materiais/${material.id}/arquivo`;
  }

  function whatsappCom(material) {
    const texto = `Olá ${lead.nome.split(' ')[0]}! Segue o material de ${lead.empreendimento}: ${linkPara(material)}`;
    window.open(`https://wa.me/${numeroWhatsapp(telLimpo)}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
    setAberto(false);
  }

  const botaoBase = 'flex items-center gap-1.5 px-3 text-xs font-semibold transition-colors';
  const botaoEstilo = {
    minHeight: '34px', background: 'rgba(var(--blue-rgb), 0.10)', color: 'var(--blue)',
    border: '1px solid rgba(var(--blue-rgb), 0.3)', borderRadius: '2px', cursor: 'pointer',
  };

  if (materiais.length === 1) {
    return (
      <button onClick={() => whatsappCom(materiais[0])} className={botaoBase} style={botaoEstilo} title="Enviar material">
        <i className="ti ti-file-arrow-right text-[15px]" aria-hidden="true" />
        Material
      </button>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setAberto((v) => !v)} className={botaoBase} style={botaoEstilo} title="Enviar material">
        <i className="ti ti-file-arrow-right text-[15px]" aria-hidden="true" />
        Material
        <i className={`ti ti-chevron-down text-[12px] transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {aberto && (
        <div className="absolute right-0 top-full mt-1 py-1.5 z-50" style={{
          background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
          borderRadius: '4px', boxShadow: '0 8px 24px rgba(var(--ink-rgb), 0.12)', minWidth: '220px',
        }}>
          {materiais.map((m) => (
            <button key={m.id} onClick={() => whatsappCom(m)}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors"
              style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
              <i className="ti ti-file text-[14px] flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{m.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Botão compacto de ação do cabeçalho (Ligar/WhatsApp/E-mail) — mesmo
// visual dos três, só muda cor/ícone/href.
function BotaoAcaoHeader({ href, icon, label, cor, corRgb, alvo }) {
  return (
    <a href={href} target={alvo} rel={alvo ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-1.5 px-3 text-xs font-semibold transition-colors"
      style={{
        minHeight: '34px', background: `rgba(${corRgb}, 0.10)`, color: cor,
        border: `1px solid rgba(${corRgb}, 0.3)`, borderRadius: '2px', textDecoration: 'none',
      }}>
      <i className={`ti ti-${icon} text-[15px]`} aria-hidden="true" />
      {label}
    </a>
  );
}

// Autoria de um item do histórico — nome + avatar (iniciais, mesmo padrão
// já usado no cabeçalho pro corretor responsável). Registros antigos sem
// autor gravado mostram "Autor não registrado" em cinza, sem inventar
// nome (Avatar já cai pra "?" sozinho quando nome vem vazio/undefined).
function AutorLinha({ nome }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: nome ? 'var(--text-secondary)' : 'var(--text-faint)', fontWeight: nome ? 600 : 400 }}>
      <Avatar nome={nome} size={16} opaco={!nome} />
      {nome || 'Autor não registrado'}
    </span>
  );
}

export default function LeadDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { usuario } = useAuth();
  const { modoSolo } = useConfig();

  const [lead, setLead] = useState(null);

  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [notas, setNotas] = useState('');
  const [notasAbertas, setNotasAbertas] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [visitas, setVisitas] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [visitaForm, setVisitaForm] = useState({ data: '', hora: '', empreendimento: '', comentario: '', gerenteId: '' });
  const [cadastrandoVisita, setCadastrandoVisita] = useState(false);
  const [modalVisita, setModalVisita] = useState(false);
  const [registrandoContato, setRegistrandoContato] = useState(false);

  const [modalDescarte, setModalDescarte] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [descartando, setDescartando] = useState(false);
  const [motivosDescarte, setMotivosDescarte] = useState([]);

  // Perfil de busca (Fase 2) — agora dentro do grid unificado de dados
  const [editandoDados, setEditandoDados] = useState(false);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [dadosForm, setDadosForm] = useState(null);
  const [salvandoDados, setSalvandoDados] = useState(false);

  // Tarefas do lead
  const [tarefasLead, setTarefasLead] = useState([]);
  const [modalTarefaForm, setModalTarefaForm] = useState(null); // {} | { tarefa }
  const [modalConcluirTarefa, setModalConcluirTarefa] = useState(null);

  // Materiais do empreendimento do lead — só pro corretor dono do lead.
  const [materiaisEmpreendimento, setMateriaisEmpreendimento] = useState([]);

  // Navegação anterior/próximo — mesma lista/escopo que a tela Leads usa
  // (o backend já filtra por perfil em GET /leads), ordenada por entrada
  // mais recente primeiro, igual ao resto do app.
  const [listaLeads, setListaLeads] = useState([]);

  const isCorretorResponsavel = usuario?.perfil === 'corretor' && lead?.corretorId === usuario?.id;
  const podeEscrever = isCorretorResponsavel;
  const podeEditarDados = isCorretorResponsavel || usuario?.perfil === 'editor';
  const podeEditarTarefa = ['corretor', 'gerente', 'editor'].includes(usuario?.perfil);

  useEffect(() => {
    if (searchParams.get('descartar') === '1' && podeEscrever && !lead?.descartado) {
      setModalDescarte(true);
      setSearchParams((p) => { p.delete('descartar'); return p; }, { replace: true });
    }
  }, [lead, podeEscrever]); // eslint-disable-line react-hooks/exhaustive-deps

  function carregarTarefas() {
    api.get('/tarefas', { params: { leadId: id } }).then((r) => setTarefasLead(r.data)).catch(() => {});
  }
  function carregarComentarios() {
    api.get(`/leads/${id}/comentarios`).then((r) => setComentarios(r.data)).catch(() => {});
  }

  function aoConcluirTarefa({ criarProxima }) {
    setModalConcluirTarefa(null);
    carregarTarefas();
    carregarComentarios(); // a conclusão vira comentário na timeline
    if (criarProxima) setModalTarefaForm({});
  }

  async function cancelarTarefa(t) {
    if (!window.confirm(`Cancelar a tarefa "${t.titulo}"?`)) return;
    try { await api.post(`/tarefas/${t.id}/cancelar`); carregarTarefas(); } catch {}
  }

  useEffect(() => {
    api.get(`/leads/${id}`).then((r) => { setLead(r.data); setNotas(r.data.notas || ''); }).catch(() => navigate('/leads'));
    api.get(`/leads/${id}/comentarios`).then((r) => setComentarios(r.data)).catch(() => {});
    api.get(`/leads/${id}/visitas`).then((r) => setVisitas(r.data)).catch(() => {});
    api.get('/gerentes').then((r) => setGerentes(r.data)).catch(() => {});
    api.get('/motivos-descarte').then((r) => setMotivosDescarte(r.data)).catch(() => {});
    api.get('/empreendimentos', { params: { ativo: 'true' } }).then((r) => setEmpreendimentos(r.data)).catch(() => {});
    api.get('/tarefas', { params: { leadId: id } }).then((r) => setTarefasLead(r.data)).catch(() => {});
  }, [id]);

  // Lista pra "anterior/próximo" — carrega 1x (mesmo escopo de sempre:
  // corretor só vê os dele, o resto vê tudo, igual à tela Leads).
  useEffect(() => {
    if (!usuario) return;
    api.get('/leads').then((r) => {
      const ordenada = [...r.data].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
      setListaLeads(ordenada);
    }).catch(() => {});
  }, [usuario]);

  useEffect(() => {
    if (!lead?.empreendimentoId || !podeEscrever) { setMateriaisEmpreendimento([]); return; }
    api.get(`/empreendimentos/${lead.empreendimentoId}/materiais`)
      .then((r) => setMateriaisEmpreendimento(r.data))
      .catch(() => setMateriaisEmpreendimento([]));
  }, [lead?.empreendimentoId, podeEscrever]);

  const indiceAtual = listaLeads.findIndex((l) => l.id === id);
  const leadAnterior = indiceAtual > 0 ? listaLeads[indiceAtual - 1] : null;
  const leadProximo = indiceAtual >= 0 && indiceAtual < listaLeads.length - 1 ? listaLeads[indiceAtual + 1] : null;

  function abrirEdicaoDados() {
    setDadosForm({
      tipologia: lead.tipologia || '',
      finalidade: lead.finalidade || '',
      formaPagamento: lead.formaPagamento || '',
      prazoCompra: lead.prazoCompra || '',
      origem: lead.origem || '',
      empreendimentoId: lead.empreendimentoId || '',
      faixaValor: { min: lead.faixaValor?.min ?? '', max: lead.faixaValor?.max ?? '' },
    });
    setEditandoDados(true);
  }

  async function salvarDados(e) {
    e.preventDefault();
    setSalvandoDados(true);
    try {
      const emp = empreendimentos.find((x) => x.id === dadosForm.empreendimentoId);
      const payload = { ...dadosForm };
      if (emp) payload.empreendimento = emp.nome; // mantém texto em sincronia
      const r = await api.patch(`/leads/${id}/perfil`, payload);
      setLead(r.data);
      setEditandoDados(false);
    } finally {
      setSalvandoDados(false);
    }
  }

  async function mudarStatus(status) {
    if (!podeEscrever || !status) return;
    const res = await api.patch(`/leads/${id}/status`, { status });
    setLead(res.data);
    carregarComentarios(); // mudança de status vira entrada na timeline
  }

  // Botão manual "Registrar contato" — comentário/visita/status já
  // registram sozinhos (backend, idempotente); isso aqui é só pra quando
  // o corretor ligou/conversou sem nenhuma dessas três ações.
  async function registrarContato() {
    if (!podeEscrever || registrandoContato) return;
    setRegistrandoContato(true);
    try {
      const res = await api.post(`/leads/${id}/primeiro-contato`);
      setLead(res.data);
    } finally { setRegistrandoContato(false); }
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
      setModalVisita(false);
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
      <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const telLimpo = lead.telefone?.replace(/\D/g, '');

  // Timeline unificada — comentários (mudança de status já vira comentário
  // "Estágio: X → Y" no backend), tarefas e visitas, tudo cronológico,
  // mais recente primeiro. Cada tipo mantém sua própria aparência (a
  // tarefa continua com concluir/editar/cancelar funcionando).
  const timelineItens = [
    ...comentarios.map((c) => ({ tipo: 'comentario', dataOrdenacao: c.criadoEm, item: c })),
    ...tarefasLead.map((t) => ({ tipo: 'tarefa', dataOrdenacao: t.criadoEm, item: t })),
    ...visitas.map((v) => ({ tipo: 'visita', dataOrdenacao: v.criadoEm || `${v.data}T${v.hora || '00:00'}`, item: v })),
  ]
    .filter((e) => e.dataOrdenacao)
    .sort((a, b) => new Date(b.dataOrdenacao) - new Date(a.dataOrdenacao));

  // Campos do "Dados do lead" — grid de dois por linha, unificado (dados
  // fixos + perfil de busca), sem repetir Origem duas vezes.
  const camposFixos = [
    { label: 'Telefone', valor: lead.telefone },
    { label: 'E-mail', valor: lead.email || '—' },
  ];
  const camposPerfil = [
    { label: 'Empreendimento', valor: lead.empreendimento || null },
    { label: 'Finalidade', valor: lead.finalidade },
    { label: 'Tipologia', valor: lead.tipologia },
    {
      label: 'Faixa de valor',
      valor: (lead.faixaValor && (lead.faixaValor.min != null || lead.faixaValor.max != null))
        ? [fmtMoeda(lead.faixaValor.min), fmtMoeda(lead.faixaValor.max)].filter(Boolean).join(' — ')
        : null,
    },
    { label: 'Forma de pagamento', valor: lead.formaPagamento },
    { label: 'Prazo de compra', valor: lead.prazoCompra },
    { label: 'Origem', valor: lead.origem },
    { label: 'Corretor', valor: lead.corretorNome || 'Não atribuído' },
  ];
  const preenchidosPerfil = camposPerfil.filter((c) => c.valor).length;

  return (
    <div style={breakoutStyle}>
      <div className="mx-auto px-4 md:px-6" style={{ maxWidth: '1180px' }}>

        {/* Voltar — rola junto, fora do cabeçalho fixo */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm transition-colors mb-3"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <i className="ti ti-arrow-left text-[16px]" aria-hidden="true" />
          Voltar
        </button>

        {/* ── Cabeçalho fixo ──────────────────────────────────── */}
        <div className="card sticky top-12 md:top-0 z-20" style={{ boxShadow: '0 2px 10px rgba(var(--ink-rgb), 0.06)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex items-start gap-2">
              <button
                onClick={() => leadAnterior && navigate(`/leads/${leadAnterior.id}`)}
                disabled={!leadAnterior}
                title="Lead anterior"
                className="w-7 h-7 flex items-center justify-center rounded flex-shrink-0 mt-1"
                style={{ color: leadAnterior ? 'var(--text-tertiary)' : 'var(--text-faint)', opacity: leadAnterior ? 1 : 0.4 }}
              >
                <i className="ti ti-chevron-left text-[18px]" aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold truncate" style={{ color: 'var(--text)' }}>{lead.nome}</h1>
                  <BadgeStatus status={lead.descartado ? 'descartado' : lead.status} showTemp />
                </div>
                <p className="font-semibold text-sm mt-1" style={{ color: 'var(--accent)' }}>{lead.empreendimento || 'Sem empreendimento definido'}</p>
                <div className="flex items-center gap-2 flex-wrap mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                  <span title={fmtDataHora(lead.criadoEm)}>
                    <i className="ti ti-clock text-[12px] mr-0.5" aria-hidden="true" />
                    {tempoRelativo(lead.criadoEm)}
                  </span>
                  <span>·</span>
                  <span>{lead.origem}</span>
                  <span>·</span>
                  {lead.primeiroContatoEm ? (
                    <>
                      <span title={fmtDataHora(lead.primeiroContatoEm)}>
                        <i className="ti ti-phone-check text-[12px] mr-0.5" aria-hidden="true" />
                        Primeiro contato: {tempoRelativo(lead.primeiroContatoEm)}
                      </span>
                      {lead.alerta?.tipo === 'parado' && !lead.descartado && (() => {
                        const c = corAlerta(lead.alerta);
                        return (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: c.cor }}>
                              <i className={`ti ti-${c.icone} text-[12px]`} aria-hidden="true" />
                              {textoAlerta(lead.alerta)}
                            </span>
                          </>
                        );
                      })()}
                    </>
                  ) : !lead.descartado && lead.alerta?.tipo === 'sem_contato' ? (() => {
                    // Já passou do limite configurado (ex.: 2h) — mesmo texto/cor
                    // que dispara o push, pra nunca divergir do que alerta o corretor.
                    const c = corAlerta(lead.alerta);
                    return (
                      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: c.cor }}>
                        <i className={`ti ti-${c.icone} text-[12px]`} aria-hidden="true" />
                        {textoAlerta(lead.alerta)}
                      </span>
                    );
                  })() : !lead.descartado ? (
                    <span className="inline-flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                      <i className="ti ti-phone-off text-[12px]" aria-hidden="true" />
                      Sem contato registrado
                    </span>
                  ) : (
                    <span>Sem contato registrado</span>
                  )}
                  {lead.aguardandoDistribuicao && !lead.descartado && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--amber)' }}>
                        <i className="ti ti-clock-pause text-[12px]" aria-hidden="true" />
                        Aguardando distribuição
                      </span>
                    </>
                  )}
                  {lead.corretorNome && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar nome={lead.corretorNome} size={16} />
                        {lead.corretorNome}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => leadProximo && navigate(`/leads/${leadProximo.id}`)}
                disabled={!leadProximo}
                title="Próximo lead"
                className="w-7 h-7 flex items-center justify-center rounded flex-shrink-0 mt-1"
                style={{ color: leadProximo ? 'var(--text-tertiary)' : 'var(--text-faint)', opacity: leadProximo ? 1 : 0.4 }}
              >
                <i className="ti ti-chevron-right text-[18px]" aria-hidden="true" />
              </button>
            </div>

            {/* Ações compactas — sempre visíveis, não somem ao rolar (fazem
                parte do próprio cabeçalho sticky). */}
            {!lead.descartado && (
              <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                <BotaoAcaoHeader href={`tel:${telLimpo}`} icon="phone" label="Ligar" cor="var(--accent-hover)" corRgb="var(--accent-rgb)" />
                <BotaoAcaoHeader href={`https://wa.me/${numeroWhatsapp(telLimpo)}`} icon="brand-whatsapp" label="WhatsApp" cor="var(--success)" corRgb="var(--success-rgb)" alvo="_blank" />
                {lead.email && (
                  <BotaoAcaoHeader href={`mailto:${lead.email}`} icon="mail" label="E-mail" cor="var(--text-secondary)" corRgb="var(--ink-rgb)" />
                )}
                {podeEscrever && materiaisEmpreendimento.length > 0 && (
                  <BotaoEnviarMaterial lead={lead} telLimpo={telLimpo} materiais={materiaisEmpreendimento} empreendimentoId={lead.empreendimentoId} />
                )}
              </div>
            )}
          </div>

          {lead.descartado && (
            <div className="mt-3 p-3 rounded" style={{ background: 'var(--surface-4)', border: '1px solid rgba(var(--ink-rgb), 0.05)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Marcado como Não Cliente</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Motivo: {lead.motivoDescarte}</p>
              {lead.descartadoPorNome && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                  Por {lead.descartadoPorNome} · {lead.descartadoEm && new Date(lead.descartadoEm).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Duas colunas ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mt-4">

          {/* Coluna esquerda — dados do lead, grid de 2 por linha */}
          <div className="space-y-4 order-2 lg:order-1 min-w-0">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Dados do lead</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: preenchidosPerfil === camposPerfil.length ? 'rgba(var(--success-rgb), 0.15)' : 'rgba(var(--ink-rgb), 0.06)',
                             color: preenchidosPerfil === camposPerfil.length ? 'var(--success)' : 'var(--text-tertiary)' }}>
                    {preenchidosPerfil} de {camposPerfil.length}
                  </span>
                </div>
                {podeEditarDados && !lead.descartado && !editandoDados && (
                  <button onClick={abrirEdicaoDados} className="text-xs px-3 py-1.5 rounded font-medium"
                    style={{ background: 'rgba(var(--ink-rgb), 0.06)', color: 'var(--text)' }}>
                    <i className="ti ti-pencil mr-1" aria-hidden="true" />Editar
                  </button>
                )}
              </div>

              {!editandoDados ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[...camposFixos, ...camposPerfil].map((c) => (
                    <div key={c.label}>
                      <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>{c.label}</dt>
                      <dd className="font-medium mt-0.5">
                        {c.valor ? (
                          <span style={{ color: 'var(--text)' }}>{c.valor}</span>
                        ) : podeEditarDados && !lead.descartado ? (
                          <button onClick={abrirEdicaoDados} style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                            — <span className="text-xs">adicionar</span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <form onSubmit={salvarDados} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Empreendimento</label>
                      <select className="input" value={dadosForm.empreendimentoId}
                        onChange={(e) => setDadosForm({ ...dadosForm, empreendimentoId: e.target.value })}>
                        <option value="">—</option>
                        {empreendimentos.map((emp) => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tipologia</label>
                      <select className="input" value={dadosForm.tipologia}
                        onChange={(e) => setDadosForm({ ...dadosForm, tipologia: e.target.value })}>
                        <option value="">—</option>
                        {TIPOLOGIAS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Faixa de valor (R$)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" className="input" placeholder="Mínimo" value={dadosForm.faixaValor.min}
                        onChange={(e) => setDadosForm({ ...dadosForm, faixaValor: { ...dadosForm.faixaValor, min: e.target.value } })} />
                      <input type="number" className="input" placeholder="Máximo" value={dadosForm.faixaValor.max}
                        onChange={(e) => setDadosForm({ ...dadosForm, faixaValor: { ...dadosForm.faixaValor, max: e.target.value } })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Finalidade</label>
                      <select className="input" value={dadosForm.finalidade}
                        onChange={(e) => setDadosForm({ ...dadosForm, finalidade: e.target.value })}>
                        <option value="">—</option>
                        {FINALIDADES.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Forma de pagamento</label>
                      <select className="input" value={dadosForm.formaPagamento}
                        onChange={(e) => setDadosForm({ ...dadosForm, formaPagamento: e.target.value })}>
                        <option value="">—</option>
                        {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Prazo de compra</label>
                      <select className="input" value={dadosForm.prazoCompra}
                        onChange={(e) => setDadosForm({ ...dadosForm, prazoCompra: e.target.value })}>
                        <option value="">—</option>
                        {PRAZOS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Origem</label>
                      <select className="input" value={dadosForm.origem}
                        onChange={(e) => setDadosForm({ ...dadosForm, origem: e.target.value })}>
                        <option value="">—</option>
                        {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setEditandoDados(false)}
                      className="flex-1 text-sm py-2 rounded font-medium"
                      style={{ background: 'rgba(var(--ink-rgb), 0.06)', color: 'var(--text)' }}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={salvandoDados} className="flex-1 btn-primary">
                      {salvandoDados ? 'Salvando...' : 'Salvar dados'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Coluna direita — ações rápidas */}
          <div className="space-y-4 order-1 lg:order-2 min-w-0">
            {podeEscrever && !lead.descartado && (
              <div className="card space-y-3">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Ações rápidas</h2>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Status</label>
                  <select className="input" value={lead.status} onChange={(e) => mudarStatus(e.target.value)}>
                    {TEMPERATURA_OPCOES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label} · {o.temp}</option>
                    ))}
                  </select>
                </div>

                <div className={`grid gap-2 ${lead.primeiroContatoEm ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {!lead.primeiroContatoEm && (
                    <button onClick={registrarContato} disabled={registrandoContato} className="text-xs font-medium py-2 rounded flex items-center justify-center gap-1.5"
                      style={{ background: 'rgba(var(--amber-rgb), 0.10)', color: 'var(--amber)', border: '1px solid rgba(var(--amber-rgb), 0.3)' }}>
                      <i className="ti ti-phone-check text-[14px]" aria-hidden="true" />
                      {registrandoContato ? '...' : 'Contato'}
                    </button>
                  )}
                  <button onClick={() => setModalVisita(true)} className="text-xs font-medium py-2 rounded flex items-center justify-center gap-1.5"
                    style={{ background: 'rgba(var(--purple-rgb), 0.10)', color: 'var(--purple)', border: '1px solid rgba(var(--purple-rgb), 0.25)' }}>
                    <i className="ti ti-calendar-event text-[14px]" aria-hidden="true" />
                    Visita
                  </button>
                  <button onClick={() => setModalTarefaForm({})} className="text-xs font-medium py-2 rounded flex items-center justify-center gap-1.5"
                    style={{ background: 'rgba(var(--blue-rgb), 0.10)', color: 'var(--blue)', border: '1px solid rgba(var(--blue-rgb), 0.25)' }}>
                    <i className="ti ti-checklist text-[14px]" aria-hidden="true" />
                    Tarefa
                  </button>
                </div>

                {/* Comentário rápido — sempre visível, sem procurar aba.
                    Enviar um comentário também registra o primeiro contato
                    sozinho (backend) — o botão "Contato" acima é só pra
                    quando o corretor ligou sem escrever nada aqui. */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Comentário rápido</label>
                  <form onSubmit={enviarComentario} className="space-y-2">
                    <textarea
                      className="input min-h-[64px] resize-y text-sm"
                      placeholder="Ex: Liguei, não atendeu. / Agendou visita para dia 25..."
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                    />
                    <button type="submit" disabled={enviando || !novoComentario.trim()} className="btn-primary w-full text-sm" style={{ minHeight: '36px' }}>
                      {enviando ? 'Registrando...' : 'Registrar'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {podeEditarTarefa && lead.descartado && (
              <div className="card">
                <button onClick={() => setModalTarefaForm({})} className="text-sm font-medium py-2 rounded w-full flex items-center justify-center gap-1.5"
                  style={{ background: 'rgba(var(--blue-rgb), 0.10)', color: 'var(--blue)', border: '1px solid rgba(var(--blue-rgb), 0.25)' }}>
                  <i className="ti ti-checklist text-[14px]" aria-hidden="true" />
                  Nova tarefa
                </button>
              </div>
            )}

            {/* Notas — resumo livre, recolhido por padrão pra não competir
                por espaço com as ações rápidas. */}
            {podeEscrever && (
              <div className="card">
                <button onClick={() => setNotasAbertas((v) => !v)} className="flex items-center gap-2 w-full text-left">
                  <i className={`ti ti-chevron-${notasAbertas ? 'down' : 'right'} text-[16px]`} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                  <h2 className="font-semibold text-sm flex-1" style={{ color: 'var(--text)' }}>Notas</h2>
                  {!notasAbertas && notas && <i className="ti ti-file-text text-[14px]" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />}
                </button>
                {notasAbertas && (
                  <div className="mt-3">
                    <textarea
                      className="input min-h-[100px] resize-y text-sm"
                      placeholder="Resumo livre sobre este lead..."
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                    />
                    <button onClick={salvarNotas} disabled={salvando} className="btn-secondary mt-2 text-sm w-full" style={{ minHeight: '36px' }}>
                      {salvando ? 'Salvando...' : 'Salvar notas'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Zona de atenção — discreta, dentro da coluna de ações */}
            {podeEscrever && !lead.descartado && (
              <div className="card" style={{ borderColor: 'rgba(var(--accent-rgb), 0.2)' }}>
                <button
                  onClick={() => setModalDescarte(true)}
                  className="text-xs font-medium transition-colors w-full text-left"
                  style={{ color: 'var(--accent-hover)' }}
                >
                  <i className="ti ti-ban mr-1.5" aria-hidden="true" />
                  Marcar como Não Cliente
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Histórico — largura total ───────────────────────── */}
        <div className="card mt-4">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Histórico
            {timelineItens.length > 0 && (
              <span className="font-normal text-sm ml-2" style={{ color: 'var(--text-muted)' }}>({timelineItens.length})</span>
            )}
          </h2>

          {timelineItens.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-faint)' }}>Nenhuma interação registrada ainda.</p>
          ) : (
            <div>
              {timelineItens.map((entry, i) => {
                const chave = `${entry.tipo}-${entry.item.id || i}`;
                const ehMudancaStatus = entry.tipo === 'comentario' && entry.item.texto?.startsWith('Estágio:');
                return (
                  <div key={chave} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: ehMudancaStatus ? 'var(--blue)' : entry.tipo === 'visita' ? 'var(--purple)' : entry.tipo === 'tarefa' ? 'var(--teal)' : 'var(--accent)' }} />
                      {i < timelineItens.length - 1 && (
                        <div className="w-px flex-1 mt-1" style={{ background: 'rgba(var(--ink-rgb), 0.06)' }} />
                      )}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      {entry.tipo === 'comentario' && (
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <AutorLinha nome={entry.item.autorNome} />
                            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{fmtDataHora(entry.item.criadoEm)}</span>
                          </div>
                          <p className="text-sm mt-1" style={{ color: ehMudancaStatus ? 'var(--blue)' : 'var(--text)', fontStyle: ehMudancaStatus ? 'italic' : 'normal' }}>
                            {entry.item.texto}
                          </p>
                        </div>
                      )}

                      {entry.tipo === 'tarefa' && (
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <AutorLinha nome={entry.item.criadoPorNome} />
                            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>criou esta tarefa</span>
                          </div>
                          <TarefaCard
                            tarefa={entry.item}
                            podeEditar={podeEditarTarefa}
                            modoSolo={modoSolo}
                            onConcluir={setModalConcluirTarefa}
                            onEditar={(tar) => setModalTarefaForm({ tarefa: tar })}
                            onCancelar={cancelarTarefa}
                          />
                        </div>
                      )}

                      {entry.tipo === 'visita' && (
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <AutorLinha nome={entry.item.corretorNome} />
                            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>agendou esta visita</span>
                          </div>
                          <div className="flex gap-3 p-3 rounded" style={{ background: 'rgba(var(--purple-rgb), 0.06)', border: '1px solid rgba(var(--purple-rgb), 0.15)' }}>
                            <div className="text-center min-w-[44px]">
                              <p className="text-lg font-bold" style={{ color: 'var(--purple)' }}>
                                {new Date(entry.item.data + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--purple)' }}>
                                {new Date(entry.item.data + 'T00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Visita · {entry.item.empreendimento}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{entry.item.hora} · Gerente: {entry.item.gerenteNome}</p>
                              {entry.item.comentario && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{entry.item.comentario}</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: agendar visita */}
      {modalVisita && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded" style={{ background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.08)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Agendar visita</h3>
            <form onSubmit={agendarVisita} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Data</label>
                  <input type="date" className="input" value={visitaForm.data} onChange={(e) => setVisitaForm({ ...visitaForm, data: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Horário</label>
                  <input type="time" className="input" value={visitaForm.hora} onChange={(e) => setVisitaForm({ ...visitaForm, hora: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Empreendimento</label>
                <SeletorEmpreendimento
                  value={visitaForm.empreendimento}
                  onChange={(nome) => setVisitaForm({ ...visitaForm, empreendimento: nome })}
                  podeCriar={['gerente', 'editor'].includes(usuario?.perfil)}
                  placeholder="Buscar ou digitar empreendimento..."
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Gerente da visita</label>
                <select className="input" value={visitaForm.gerenteId} onChange={(e) => setVisitaForm({ ...visitaForm, gerenteId: e.target.value })} required>
                  <option value="">Selecionar gerente...</option>
                  {gerentes.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Comentário</label>
                <input className="input" placeholder="Observações da visita..." value={visitaForm.comentario} onChange={(e) => setVisitaForm({ ...visitaForm, comentario: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModalVisita(false)}
                  className="flex-1 text-sm py-2 rounded font-medium"
                  style={{ background: 'rgba(var(--ink-rgb), 0.06)', color: 'var(--text)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={cadastrandoVisita} className="flex-1 btn-primary">
                  {cadastrandoVisita ? 'Agendando...' : 'Agendar visita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de descarte */}
      {modalDescarte && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded" style={{ background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.08)' }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>Marcar como Não Cliente?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Escolha o motivo. Esta ação não pode ser desfeita.</p>

            <div className="space-y-2 mb-4">
              {[...motivosDescarte.map((m) => m.texto), 'Outro'].map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
                  style={{
                    borderRadius: '2px',
                    border: '1px solid',
                    ...(motivo === m
                      ? { borderColor: 'var(--accent)', background: 'rgba(var(--accent-rgb), 0.08)' }
                      : { borderColor: 'rgba(var(--ink-rgb), 0.08)', background: 'transparent' }),
                  }}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m}
                    checked={motivo === m}
                    onChange={() => setMotivo(m)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{m}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setModalDescarte(false); setMotivo(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  borderRadius: '2px',
                  border: '1px solid rgba(var(--ink-rgb), 0.12)',
                  color: 'var(--text-tertiary)',
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

      {/* Modais de tarefa */}
      {modalTarefaForm && lead && (
        <TarefaFormModal
          tarefa={modalTarefaForm.tarefa}
          leadIdFixo={id}
          leadNomeFixo={lead.nome}
          usuario={usuario}
          modoSolo={modoSolo}
          onClose={() => setModalTarefaForm(null)}
          onSalvo={() => { setModalTarefaForm(null); carregarTarefas(); }}
        />
      )}
      {modalConcluirTarefa && (
        <ConcluirTarefaModal
          tarefa={modalConcluirTarefa}
          onClose={() => setModalConcluirTarefa(null)}
          onConcluido={aoConcluirTarefa}
        />
      )}
    </div>
  );
}
