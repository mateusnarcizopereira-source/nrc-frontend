import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// 7 etapas do funil (mesma escala de temperatura usada em BadgeStatus/LeadDetalhe).
const ETAPAS_FUNIL = [
  { key: 'tentando_contato',  label: 'Tentando\nContato' },
  { key: 'material_enviado',  label: 'Material\nEnviado' },
  { key: 'sem_resposta',      label: 'Sem\nResposta' },
  { key: 'meeting_agendado',  label: 'Meeting\nAgendado' },
  { key: 'visita_agendada',   label: 'Visita\nAgendada' },
  { key: 'proposta',          label: 'Proposta' },
  { key: 'venda_finalizada',  label: 'Venda\nFinalizada' },
];

// Pizza "Origem dos Leads" — tons complementares ao vermelho, nunca cinza.
const CORES_ORIGEM = ['var(--coral)', 'var(--terracotta)', 'var(--gold)', 'var(--bordo)', 'var(--accent-active)'];

// Tick multi-linha (recharts não quebra "\n" sozinho em <text> SVG — precisa
// de <tspan> por linha).
function TickDuasLinhas({ x, y, payload }) {
  const linhas = String(payload.value).split('\n');
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fontSize={10.5} fill="var(--text-tertiary)">
        {linhas.map((linha, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 12 : 12}>{linha}</tspan>
        ))}
      </text>
    </g>
  );
}

function TooltipCard({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-xs px-3 py-2" style={{
      background: 'var(--surface)', border: '1px solid var(--border-color)',
      borderRadius: '4px', boxShadow: '0 4px 12px rgba(var(--ink-rgb), 0.10)',
    }}>
      {label && <p className="font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.payload?.fill || 'var(--text-secondary)' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export function GraficoFunil({ leads }) {
  const dados = ETAPAS_FUNIL.map((e) => ({
    etapa: e.label,
    quantidade: leads.filter((l) => !l.descartado && l.status === e.key).length,
  }));

  return (
    <div className="card">
      <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Leads por Etapa do Funil</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dados} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-color)" />
          <XAxis
            dataKey="etapa" tick={<TickDuasLinhas />} height={34}
            tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} interval={0}
          />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<TooltipCard />} cursor={{ fill: 'rgba(var(--ink-rgb), 0.04)' }} />
          <Bar dataKey="quantidade" name="Leads" fill="var(--accent)" radius={[8, 8, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoOrigem({ leads }) {
  const porOrigem = {};
  leads.forEach((l) => {
    const origem = l.origem || 'Outra';
    porOrigem[origem] = (porOrigem[origem] || 0) + 1;
  });
  const dados = Object.entries(porOrigem).map(([origem, quantidade]) => ({ name: origem, value: quantidade }));

  if (dados.length === 0) {
    return (
      <div className="card">
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Origem dos Leads</h2>
        <p className="text-sm text-center py-16" style={{ color: 'var(--text-muted)' }}>Sem dados ainda.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Origem dos Leads</h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={dados} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
            {dados.map((_, i) => <Cell key={i} fill={CORES_ORIGEM[i % CORES_ORIGEM.length]} stroke="var(--surface)" strokeWidth={2} />)}
          </Pie>
          <Tooltip content={<TooltipCard />} />
          <Legend
            layout="vertical" verticalAlign="middle" align="right"
            wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
