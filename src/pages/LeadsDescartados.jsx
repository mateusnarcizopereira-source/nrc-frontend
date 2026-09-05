import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function LeadsDescartados() {
  const [leads, setLeads] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    api.get('/leads-descartados').then((r) => setLeads(r.data)).finally(() => setCarregando(false));
  }, []);

  const filtrados = leads.filter((l) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return [l.nome, l.empreendimento, l.corretorNome, l.motivoDescarte].some((s) => s?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Não Clientes</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {filtrados.length} lead{filtrados.length !== 1 ? 's' : ''} descartado{filtrados.length !== 1 ? 's' : ''}
        </p>
      </div>

      <input
        className="input max-w-xs"
        placeholder="Buscar por nome, empreendimento, motivo..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: 'var(--text-muted)' }}>Nenhum lead descartado encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map((lead) => (
            <Link
              to={`/leads/${lead.id}`}
              key={lead.id}
              className="card block transition-all"
              style={{ textDecoration: 'none', opacity: 0.75 }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.06)'; }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="font-semibold line-through"
                      style={{ color: 'var(--text-muted)', textDecorationColor: 'var(--text-faint)' }}
                    >
                      {lead.nome}
                    </p>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                    >
                      Não Cliente
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{lead.empreendimento}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>
                    <span>{lead.telefone}</span>
                    {lead.corretorNome && <span>Corretor: {lead.corretorNome}</span>}
                  </div>
                  <div
                    className="mt-2 p-2 rounded"
                    style={{ background: 'var(--surface-4)', border: '1px solid rgba(var(--ink-rgb), 0.04)' }}
                  >
                    <p className="text-xs">
                      <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Motivo: </span>
                      <span style={{ color: 'var(--text-muted)' }}>{lead.motivoDescarte}</span>
                    </p>
                    {lead.descartadoPorNome && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        Por {lead.descartadoPorNome}
                        {lead.descartadoEm && ` · ${new Date(lead.descartadoEm).toLocaleDateString('pt-BR')}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
                  {new Date(lead.criadoEm).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
