// Paleta de status (ajuste Fase 1 — round 2): uma cor DISTINTA por etapa,
// não mais agrupada por temperatura. Fundo = tint claro (rgba baixa opacidade
// do token), texto = o token escurecido (mesmo usado em gráficos/outros
// lugares), dot = o mesmo tom do texto. Tudo via var(--token) — trocar a cor
// de uma etapa é editar o token em index.css, não aqui.
const config = {
  tentando_contato: {
    label: 'Tentando Contato',
    temp: 'GELADO',
    corRgb: 'var(--blue-rgb)',
    cor: 'var(--blue)',
  },
  material_enviado: {
    label: 'Material Enviado',
    temp: 'MORNO',
    corRgb: 'var(--amber-rgb)',
    cor: 'var(--amber)',
  },
  sem_resposta: {
    label: 'Sem Resposta',
    temp: 'GELADO',
    corRgb: 'var(--teal-rgb)',
    cor: 'var(--teal)',
  },
  meeting_agendado: {
    label: 'Meeting Agendado',
    temp: 'QUENTE',
    corRgb: 'var(--terracotta-rgb)',
    cor: 'var(--terracotta)',
  },
  visita_agendada: {
    label: 'Visita Agendada',
    temp: 'QUENTE',
    corRgb: 'var(--purple-rgb)',
    cor: 'var(--purple)',
  },
  proposta: {
    label: 'Proposta',
    temp: 'FERVENDO',
    corRgb: 'var(--warning-rgb)',
    cor: 'var(--warning)',
  },
  venda_finalizada: {
    label: 'Venda Finalizada',
    temp: 'FECHADO',
    corRgb: 'var(--success-rgb)',
    cor: 'var(--success)',
  },
  descartado: {
    label: 'Não Cliente',
    temp: '',
    corRgb: 'var(--ink-rgb)',
    cor: 'var(--text-tertiary)',
  },
};

export default function BadgeStatus({ status, showTemp = false }) {
  const c = config[status] || config.descartado;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: `rgba(${c.corRgb}, 0.14)`, color: c.cor }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.cor }} />
      {status && !config[status] ? (status || '—') : c.label}
      {showTemp && c.temp && (
        <span className="opacity-60 text-[10px] font-medium pl-0.5">· {c.temp}</span>
      )}
    </span>
  );
}

export { config as STATUS_CONFIG };
