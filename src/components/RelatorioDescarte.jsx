import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import api from '../services/api';

const SELECT_STYLE = {
  background: 'rgba(var(--ink-rgb), 0.05)', color: 'var(--text)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
};

const PERIODOS = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'custom', label: 'Personalizado' },
];

function isoInicioDia(dataStr) { return new Date(`${dataStr}T00:00:00`).toISOString(); }
function isoFimDia(dataStr) { return new Date(`${dataStr}T23:59:59.999`).toISOString(); }
function ymd(date) { return date.toISOString().slice(0, 10); }

function calcularPeriodo(periodo, custom) {
  const agora = new Date();
  if (periodo === '7d' || periodo === '30d') {
    const dias = periodo === '7d' ? 7 : 30;
    const inicio = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
    return { dataInicio: inicio.toISOString(), dataFim: agora.toISOString() };
  }
  // custom — só resolve quando as duas datas estão preenchidas
  if (!custom.inicio || !custom.fim) return null;
  return { dataInicio: isoInicioDia(custom.inicio), dataFim: isoFimDia(custom.fim) };
}

// Duração amigável (não é "tempo relativo até agora" — é a diferença ENTRE
// duas datas já conhecidas: entrada e descarte do lead).
function formatarDuracao(horas) {
  if (horas == null) return '—';
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 24) return `${horas.toFixed(1)}h`;
  return `${(horas / 24).toFixed(1)} dias`;
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

// Tick multi-linha — motivos são frases longas, quebradas em até 2 linhas
// pra não se sobrepor no eixo X (mesmo recurso usado em DashboardCharts).
function TickMotivo({ x, y, payload }) {
  const palavras = String(payload.value).split(' ');
  const meio = Math.ceil(palavras.length / 2);
  const linhas = palavras.length > 2
    ? [palavras.slice(0, meio).join(' '), palavras.slice(meio).join(' ')]
    : [String(payload.value)];
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fontSize={10} fill="var(--text-tertiary)">
        {linhas.map((linha, i) => <tspan key={i} x={0} dy={i === 0 ? 12 : 12}>{linha}</tspan>)}
      </text>
    </g>
  );
}

export default function RelatorioDescarte() {
  const [periodo, setPeriodo] = useState('30d');
  const [custom, setCustom] = useState({ inicio: ymd(new Date(Date.now() - 30 * 86400000)), fim: ymd(new Date()) });
  const [empreendimento, setEmpreendimento] = useState('');
  const [corretorId, setCorretorId] = useState('');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const range = useMemo(() => calcularPeriodo(periodo, custom), [periodo, custom]);

  useEffect(() => {
    if (!range) return; // personalizado com datas incompletas — não busca ainda
    setCarregando(true);
    setErro('');
    const params = { dataInicio: range.dataInicio, dataFim: range.dataFim };
    if (empreendimento) params.empreendimento = empreendimento;
    if (corretorId) params.corretorId = corretorId;
    api.get('/relatorios/descarte', { params })
      .then((r) => setDados(r.data))
      .catch(() => setErro('Não foi possível carregar o relatório.'))
      .finally(() => setCarregando(false));
  }, [range?.dataInicio, range?.dataFim, empreendimento, corretorId]);

  const metricCards = dados ? [
    { label: 'Leads recebidos', value: dados.totalRecebidos, cor: 'var(--text)' },
    { label: 'Leads descartados', value: dados.totalDescartados, cor: 'var(--accent)' },
    { label: '% descarte', value: `${dados.percentualDescarte}%`, cor: 'var(--accent)' },
    { label: 'Tempo médio até descarte', value: formatarDuracao(dados.tempoMedioHoras), cor: 'var(--warning)' },
  ] : [];

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="font-bold" style={{ color: 'var(--text)' }}>Relatório de Descarte</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Volume, motivo e origem dos leads descartados — argumento para ajuste de campanha e conversa com construtora.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Período</p>
          <div className="flex gap-1.5">
            {PERIODOS.map((p) => (
              <button key={p.key} type="button" onClick={() => setPeriodo(p.key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                style={periodo === p.key
                  ? { background: 'var(--accent)', color: '#fff', border: '1px solid transparent' }
                  : { background: 'var(--surface-2)', border: '1px solid rgba(var(--ink-rgb), 0.10)', color: 'var(--text-tertiary)' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {periodo === 'custom' && (
          <div className="flex items-end gap-2">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>De</p>
              <input type="date" value={custom.inicio} max={custom.fim}
                onChange={(e) => setCustom((c) => ({ ...c, inicio: e.target.value }))}
                className="text-sm px-2 py-1.5 rounded outline-none" style={SELECT_STYLE} />
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Até</p>
              <input type="date" value={custom.fim} min={custom.inicio} max={ymd(new Date())}
                onChange={(e) => setCustom((c) => ({ ...c, fim: e.target.value }))}
                className="text-sm px-2 py-1.5 rounded outline-none" style={SELECT_STYLE} />
            </div>
          </div>
        )}

        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Empreendimento</p>
          <select value={empreendimento} onChange={(e) => setEmpreendimento(e.target.value)}
            className="text-sm px-2 py-1.5 rounded outline-none" style={{ ...SELECT_STYLE, minWidth: '160px' }}>
            <option value="">Todos</option>
            {(dados?.filtros.empreendimentos || []).map((nome) => <option key={nome} value={nome}>{nome}</option>)}
          </select>
        </div>

        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Corretor</p>
          <select value={corretorId} onChange={(e) => setCorretorId(e.target.value)}
            className="text-sm px-2 py-1.5 rounded outline-none" style={{ ...SELECT_STYLE, minWidth: '160px' }}>
            <option value="">Todos</option>
            {(dados?.filtros.corretores || []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>

      {erro && <p className="text-sm py-4 text-center" style={{ color: 'var(--accent)' }}>{erro}</p>}

      {!erro && carregando && (
        <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      )}

      {!erro && !carregando && periodo === 'custom' && !range && (
        <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>Escolha as duas datas do período.</p>
      )}

      {!erro && !carregando && dados && range && (
        <>
          {dados.totalRecebidos === 0 ? (
            <div className="text-center py-12">
              <i className="ti ti-inbox-off text-3xl mb-2" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum lead recebido nesse período/filtro.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metricCards.map((c) => (
                  <div key={c.label} className="card-sm">
                    <p className="metric-label">{c.label}</p>
                    <p className="metric-number mt-1" style={{ color: c.cor }}>{c.value}</p>
                  </div>
                ))}
              </div>

              {dados.totalDescartados === 0 ? (
                <div className="text-center py-10">
                  <i className="ti ti-mood-smile text-3xl mb-2" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum descarte nesse período/filtro — nada a mostrar nos gráficos abaixo.</p>
                </div>
              ) : (
                <>
                  {/* Distribuição por motivo — gráfico */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text)' }}>Distribuição por motivo</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={dados.porMotivo} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="motivo" tick={<TickMotivo />} height={38} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} interval={0} />
                        <YAxis allowDecimals={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip content={<TooltipCard />} cursor={{ fill: 'rgba(var(--ink-rgb), 0.04)' }} />
                        <Bar dataKey="quantidade" name="Descartes" fill="var(--accent)" radius={[8, 8, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Distribuição por motivo — tabela */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left" style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                          <th className="pb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Motivo</th>
                          <th className="pb-2 text-xs uppercase tracking-wide text-right" style={{ color: 'var(--text-muted)' }}>Descartes</th>
                          <th className="pb-2 text-xs uppercase tracking-wide text-right" style={{ color: 'var(--text-muted)' }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.porMotivo.map((m) => (
                          <tr key={m.motivo} style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)' }}>
                            <td className="py-2.5" style={{ color: 'var(--text)' }}>{m.motivo}</td>
                            <td className="py-2.5 text-right" style={{ color: 'var(--text-tertiary)' }}>{m.quantidade}</td>
                            <td className="py-2.5 text-right font-semibold" style={{ color: 'var(--accent)' }}>{m.percentual}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cruzamento por origem */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text)' }}>Por origem (comparar campanhas)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left" style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                            <th className="pb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Origem</th>
                            <th className="pb-2 text-xs uppercase tracking-wide text-right" style={{ color: 'var(--text-muted)' }}>Recebidos</th>
                            <th className="pb-2 text-xs uppercase tracking-wide text-right" style={{ color: 'var(--text-muted)' }}>Descartados</th>
                            <th className="pb-2 text-xs uppercase tracking-wide text-right" style={{ color: 'var(--text-muted)' }}>% descarte</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dados.porOrigem.map((o) => (
                            <tr key={o.origem} style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)' }}>
                              <td className="py-2.5" style={{ color: 'var(--text)' }}>{o.origem}</td>
                              <td className="py-2.5 text-right" style={{ color: 'var(--text-tertiary)' }}>{o.totalRecebidos}</td>
                              <td className="py-2.5 text-right" style={{ color: 'var(--text-tertiary)' }}>{o.totalDescartados}</td>
                              <td className="py-2.5 text-right font-semibold" style={{ color: o.percentualDescarte >= 40 ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                                {o.percentualDescarte}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
