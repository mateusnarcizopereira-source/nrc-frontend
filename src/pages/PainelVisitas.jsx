import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function PainelVisitas() {
  const [visitas, setVisitas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    api.get('/visitas').then((r) => setVisitas(r.data)).finally(() => setCarregando(false));
  }, []);

  const filtradas = visitas.filter((v) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return [v.leadNome, v.empreendimento, v.corretorNome, v.gerenteNome].some((s) => s?.toLowerCase().includes(q));
  });

  const hoje = new Date().toISOString().split('T')[0];
  const proximas = filtradas.filter((v) => v.data >= hoje);
  const passadas = filtradas.filter((v) => v.data < hoje);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>Visitas</h1>
        <p className="text-sm" style={{ color: '#6A6A70' }}>
          {filtradas.length} visita{filtradas.length !== 1 ? 's' : ''} registrada{filtradas.length !== 1 ? 's' : ''}
        </p>
      </div>

      <input
        className="input max-w-xs"
        placeholder="Buscar por lead, empreendimento, corretor..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <Section titulo={`Próximas (${proximas.length})`} visitas={proximas} futuro />
          <Section titulo={`Realizadas (${passadas.length})`} visitas={passadas} />
        </>
      )}
    </div>
  );
}

function Section({ titulo, visitas, futuro = false }) {
  if (visitas.length === 0) return null;
  return (
    <div>
      <h2
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: '#3A3A42' }}
      >
        {titulo}
      </h2>
      <div className="grid gap-3">
        {visitas.map((v) => (
          <div
            key={v.id}
            className="card flex gap-4"
            style={futuro ? { borderColor: 'rgba(192,57,43,0.18)' } : {}}
          >
            <div
              className="text-center min-w-[52px] py-1 rounded flex-shrink-0 flex flex-col justify-center"
              style={
                futuro
                  ? { background: 'rgba(192,57,43,0.10)' }
                  : { background: '#141418' }
              }
            >
              <p
                className="text-xl font-black"
                style={{ color: futuro ? '#E74C3C' : '#3A3A42' }}
              >
                {new Date(v.data + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
              </p>
              <p
                className="text-xs"
                style={{ color: futuro ? '#C0392B' : '#2A2A30' }}
              >
                {new Date(v.data + 'T00:00').toLocaleDateString('pt-BR', { month: 'short' })}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#F4F4F8' }}>{v.empreendimento}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4A4A52' }}>
                    {v.hora} · Gerente: {v.gerenteNome}
                  </p>
                </div>
                {v.leadId && (
                  <Link
                    to={`/leads/${v.leadId}`}
                    className="text-xs whitespace-nowrap transition-colors"
                    style={{ color: '#C0392B', textDecoration: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {v.leadNome} →
                  </Link>
                )}
              </div>
              <div className="flex gap-3 mt-2 text-xs" style={{ color: '#3A3A42' }}>
                <span>Corretor: {v.corretorNome}</span>
              </div>
              {v.comentario && (
                <p className="text-xs mt-1.5 italic" style={{ color: '#4A4A52' }}>{v.comentario}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
