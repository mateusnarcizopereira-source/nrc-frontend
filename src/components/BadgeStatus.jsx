const config = {
  tentando_contato: {
    label: 'Tentando Contato',
    temp: 'GELADO',
    cls: 'bg-[#0d1520] text-[#5a84b8]',
    dot: 'bg-[#4a6fa5]',
    hex: '#4a6fa5',
    bg: '#0d1520',
  },
  material_enviado: {
    label: 'Material Enviado',
    temp: 'MORNO',
    cls: 'bg-[#191200] text-[#c49a10]',
    dot: 'bg-[#b8860b]',
    hex: '#b8860b',
    bg: '#191200',
  },
  sem_resposta: {
    label: 'Sem Resposta',
    temp: 'GELADO',
    cls: 'bg-[#070e1c] text-[#4a6fa5]',
    dot: 'bg-[#3a5a8a]',
    hex: '#4a6fa5',
    bg: '#070e1c',
  },
  meeting_agendado: {
    label: 'Meeting Agendado',
    temp: 'QUENTE',
    cls: 'bg-[#180c00] text-[#c87020]',
    dot: 'bg-[#c87020]',
    hex: '#e67c22',
    bg: '#180c00',
  },
  visita_agendada: {
    label: 'Visita Agendada',
    temp: 'QUENTE',
    cls: 'bg-[#1e0d00] text-[#d4742a]',
    dot: 'bg-[#d4742a]',
    hex: '#d4682a',
    bg: '#1e0d00',
  },
  proposta: {
    label: 'Proposta',
    temp: 'FERVENDO',
    cls: 'bg-[#190404] text-[#e05050]',
    dot: 'bg-[#E74C3C]',
    hex: '#E74C3C',
    bg: '#190404',
  },
  venda_finalizada: {
    label: 'Venda Finalizada',
    temp: 'FECHADO',
    cls: 'bg-[#041a08] text-[#2ECC71]',
    dot: 'bg-[#2ECC71]',
    hex: '#2ECC71',
    bg: '#041a08',
  },
  descartado: {
    label: 'Não Cliente',
    temp: '',
    cls: 'bg-[#111114] text-[#3a3a42]',
    dot: 'bg-[#2a2a32]',
    hex: '#3a3a42',
    bg: '#111114',
  },
};

export default function BadgeStatus({ status, showTemp = false }) {
  const c = config[status] || {
    label: status || '—',
    temp: '',
    cls: 'bg-[#111114] text-[#3a3a42]',
    dot: 'bg-[#2a2a32]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
      {showTemp && c.temp && (
        <span className="opacity-40 text-[10px] font-medium pl-0.5">· {c.temp}</span>
      )}
    </span>
  );
}

export { config as STATUS_CONFIG };
