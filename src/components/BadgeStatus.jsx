// Paleta de status (redesign prata claro): cada card é uma "chip" clara com
// texto escuro saturado — no tema ônix era o inverso (fundo escuro, texto
// vivo). Papel de cada cor preservado 1:1, só invertida a relação claro/escuro.
const config = {
  tentando_contato: {
    label: 'Tentando Contato',
    temp: 'GELADO',
    cls: 'bg-[#EAF1F9] text-[#3A5A8A]',
    dot: 'bg-[#4a6fa5]',
    hex: '#4a6fa5',
    bg: '#EAF1F9',
  },
  material_enviado: {
    label: 'Material Enviado',
    temp: 'MORNO',
    cls: 'bg-[#FBF3E0] text-[#8A6D0A]',
    dot: 'bg-[#b8860b]',
    hex: '#b8860b',
    bg: '#FBF3E0',
  },
  sem_resposta: {
    label: 'Sem Resposta',
    temp: 'GELADO',
    cls: 'bg-[#EAF1F9] text-[#3A5A8A]',
    dot: 'bg-[#3a5a8a]',
    hex: '#4a6fa5',
    bg: '#EAF1F9',
  },
  meeting_agendado: {
    label: 'Meeting Agendado',
    temp: 'QUENTE',
    cls: 'bg-[#FCEEE0] text-[#B5590F]',
    dot: 'bg-[#c87020]',
    hex: '#e67c22',
    bg: '#FCEEE0',
  },
  visita_agendada: {
    label: 'Visita Agendada',
    temp: 'QUENTE',
    cls: 'bg-[#FCEEE0] text-[#A85220]',
    dot: 'bg-[#d4742a]',
    hex: '#d4682a',
    bg: '#FCEEE0',
  },
  proposta: {
    label: 'Proposta',
    temp: 'FERVENDO',
    cls: 'bg-[#FBEAE8] text-[#C0392B]',
    dot: 'bg-[#E74C3C]',
    hex: '#E74C3C',
    bg: '#FBEAE8',
  },
  venda_finalizada: {
    label: 'Venda Finalizada',
    temp: 'FECHADO',
    cls: 'bg-[#E6F5EA] text-[#1E8449]',
    dot: 'bg-[#2ECC71]',
    hex: '#2ECC71',
    bg: '#E6F5EA',
  },
  descartado: {
    label: 'Não Cliente',
    temp: '',
    cls: 'bg-[#F0F0F3] text-[#75757E]',
    dot: 'bg-[#B6B6BE]',
    hex: '#75757E',
    bg: '#F0F0F3',
  },
};

export default function BadgeStatus({ status, showTemp = false }) {
  const c = config[status] || {
    label: status || '—',
    temp: '',
    cls: 'bg-[#F0F0F3] text-[#75757E]',
    dot: 'bg-[#B6B6BE]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
      {showTemp && c.temp && (
        <span className="opacity-50 text-[10px] font-medium pl-0.5">· {c.temp}</span>
      )}
    </span>
  );
}

export { config as STATUS_CONFIG };
