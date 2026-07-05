import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Relatorios() {
  const [leads, setLeads] = useState([]);

  useEffect(() => { api.get('/leads').then((r) => setLeads(r.data)); }, []);

  const porCorretor = leads.reduce((acc, lead) => {
    const key = lead.corretorNome || 'Sem corretor';
    if (!acc[key]) acc[key] = { total: 0, fechados: 0, perdidos: 0 };
    acc[key].total++;
    if (lead.status === 'fechado') acc[key].fechados++;
    if (lead.status === 'perdido') acc[key].perdidos++;
    return acc;
  }, {});

  const ranking = Object.entries(porCorretor)
    .map(([nome, dados]) => ({
      nome,
      ...dados,
      conversao: dados.total > 0 ? ((dados.fechados / dados.total) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.fechados - a.fechados);

  const total = leads.length;
  const fechados = leads.filter((l) => l.status === 'fechado').length;
  const perdidos = leads.filter((l) => l.status === 'perdido').length;
  const taxaGeral = total > 0 ? ((fechados / total) * 100).toFixed(1) : '0.0';

  const metricCards = [
    { label: 'Total de leads',    value: total,         cor: '#F4F4F8'  },
    { label: 'Fechados',          value: fechados,      cor: '#2ECC71'  },
    { label: 'Perdidos',          value: perdidos,      cor: '#E74C3C'  },
    { label: 'Taxa de conversão', value: `${taxaGeral}%`, cor: '#9B59B6' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>Relatórios</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((c) => (
          <div key={c.label} className="card">
            <p className="metric-label">{c.label}</p>
            <p className="metric-number mt-1" style={{ color: c.cor }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-bold mb-4" style={{ color: '#F4F4F8' }}>Ranking por corretor</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left"
                style={{ borderBottom: '1px solid rgba(244,244,248,0.06)' }}
              >
                {['Corretor', 'Leads', 'Fechados', 'Conversão'].map((h, i) => (
                  <th
                    key={h}
                    className={`pb-2 text-xs uppercase tracking-wide ${i > 0 ? 'text-right' : ''}`}
                    style={{ color: '#3A3A42' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr
                  key={r.nome}
                  style={{ borderBottom: '1px solid rgba(244,244,248,0.04)' }}
                >
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-5" style={{ color: '#2A2A30' }}>#{i + 1}</span>
                      <span className="font-medium" style={{ color: '#F4F4F8' }}>{r.nome}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right" style={{ color: '#6A6A70' }}>{r.total}</td>
                  <td className="py-2.5 text-right font-semibold" style={{ color: '#2ECC71' }}>{r.fechados}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className="font-semibold"
                      style={{ color: parseFloat(r.conversao) >= 20 ? '#C0392B' : '#6A6A70' }}
                    >
                      {r.conversao}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
