import { useState, useEffect } from 'react';
import api from '../services/api';

// Modelo atual de 7 estágios (leadService.js). 'venda_finalizada' é a única
// etapa que corresponde ao antigo 'fechado'; o antigo 'perdido' não é mais um
// status — virou o campo booleano `descartado`, por isso buscamos também
// /leads-descartados (mesmo gate de perfil desta própria tela).
export default function Relatorios() {
  const [leads, setLeads] = useState([]);
  const [descartados, setDescartados] = useState([]);

  useEffect(() => {
    api.get('/leads').then((r) => setLeads(r.data));
    api.get('/leads-descartados').then((r) => setDescartados(r.data)).catch(() => {});
  }, []);

  const porCorretor = {};
  function bucket(nome) {
    const key = nome || 'Sem corretor';
    if (!porCorretor[key]) porCorretor[key] = { total: 0, vendas: 0, perdidos: 0 };
    return porCorretor[key];
  }
  leads.forEach((lead) => {
    const b = bucket(lead.corretorNome);
    b.total++;
    if (lead.status === 'venda_finalizada') b.vendas++;
  });
  descartados.forEach((lead) => { bucket(lead.corretorNome).perdidos++; });

  const ranking = Object.entries(porCorretor)
    .map(([nome, dados]) => ({
      nome,
      ...dados,
      conversao: dados.total > 0 ? ((dados.vendas / dados.total) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.vendas - a.vendas);

  const total = leads.length;
  const vendas = leads.filter((l) => l.status === 'venda_finalizada').length;
  const perdidos = descartados.length;
  const taxaGeral = total > 0 ? ((vendas / total) * 100).toFixed(1) : '0.0';

  const metricCards = [
    { label: 'Leads ativos',        value: total,           cor: 'var(--text)'  },
    { label: 'Vendas',              value: vendas,          cor: 'var(--success)'  },
    { label: 'Perdidos (descarte)', value: perdidos,        cor: 'var(--accent-hover)'  },
    { label: 'Taxa de conversão',   value: `${taxaGeral}%`, cor: 'var(--purple)' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Relatórios</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((c) => (
          <div key={c.label} className="card">
            <p className="metric-label">{c.label}</p>
            <p className="metric-number mt-1" style={{ color: c.cor }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-bold mb-4" style={{ color: 'var(--text)' }}>Ranking por corretor</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left"
                style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}
              >
                {['Corretor', 'Leads', 'Vendas', 'Conversão'].map((h, i) => (
                  <th
                    key={h}
                    className={`pb-2 text-xs uppercase tracking-wide ${i > 0 ? 'text-right' : ''}`}
                    style={{ color: 'var(--text-muted)' }}
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
                  style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)' }}
                >
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-5" style={{ color: 'var(--text-faint)' }}>#{i + 1}</span>
                      <span className="font-medium" style={{ color: 'var(--text)' }}>{r.nome}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right" style={{ color: 'var(--text-tertiary)' }}>{r.total}</td>
                  <td className="py-2.5 text-right font-semibold" style={{ color: 'var(--success)' }}>{r.vendas}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className="font-semibold"
                      style={{ color: parseFloat(r.conversao) >= 20 ? 'var(--accent)' : 'var(--text-tertiary)' }}
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
