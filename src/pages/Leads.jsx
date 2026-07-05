import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import BadgeStatus from '../components/BadgeStatus';

const FILTROS = [
  { key: 'todos',             label: 'Todos'              },
  { key: 'tentando_contato',  label: 'Tentando Contato'   },
  { key: 'material_enviado',  label: 'Material Enviado'   },
  { key: 'sem_resposta',      label: 'Sem Resposta'       },
  { key: 'meeting_agendado',  label: 'Meeting Agendado'   },
  { key: 'visita_agendada',   label: 'Visita Agendada'    },
  { key: 'proposta',          label: 'Proposta'           },
  { key: 'venda_finalizada',  label: 'Venda Finalizada'   },
];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/leads').then((r) => setLeads(r.data)).finally(() => setCarregando(false));
  }, []);

  const filtrados = leads.filter((l) => {
    const matchStatus = filtro === 'todos' || l.status === filtro;
    const matchBusca  = !busca || [l.nome, l.telefone, l.empreendimento, l.corretorNome]
      .some((v) => v?.toLowerCase().includes(busca.toLowerCase()));
    return matchStatus && matchBusca;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>Leads</h1>
        <p className="text-sm" style={{ color: '#6A6A70' }}>
          {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input sm:max-w-xs"
          placeholder="Buscar por nome, telefone, empreendimento..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={
                filtro === f.key
                  ? { background: '#C0392B', color: '#fff', border: '1px solid transparent' }
                  : { background: '#141418', border: '1px solid rgba(244,244,248,0.10)', color: '#6A6A70' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: '#3A3A42' }}>Nenhum lead encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map((lead) => (
            <Link
              to={`/leads/${lead.id}`}
              key={lead.id}
              className="card block transition-all"
              style={{ textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(244,244,248,0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(244,244,248,0.06)')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold" style={{ color: '#F4F4F8' }}>{lead.nome}</p>
                    <BadgeStatus status={lead.status} showTemp />
                  </div>
                  <p className="text-sm font-medium mt-0.5" style={{ color: '#C0392B' }}>
                    {lead.empreendimento}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: '#3A3A42' }}>
                    <span>{lead.telefone}</span>
                    {lead.email && <span>{lead.email}</span>}
                    {lead.corretorNome && <span>Corretor: {lead.corretorNome}</span>}
                    <span>{lead.origem}</span>
                  </div>
                </div>
                <div className="text-xs whitespace-nowrap" style={{ color: '#3A3A42' }}>
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
