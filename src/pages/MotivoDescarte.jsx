import { useState, useEffect } from 'react';
import api from '../services/api';

export default function MotivoDescarte() {
  const [motivos, setMotivos] = useState([]);
  const [novoTexto, setNovoTexto] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [removendo, setRemovendo] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await api.get('/motivos-descarte');
      setMotivos(res.data);
    } finally {
      setCarregando(false);
    }
  }

  async function adicionar(e) {
    e.preventDefault();
    if (!novoTexto.trim()) return;
    setAdicionando(true);
    try {
      const res = await api.post('/motivos-descarte', { texto: novoTexto.trim() });
      setMotivos((prev) => [...prev, res.data]);
      setNovoTexto('');
    } finally {
      setAdicionando(false);
    }
  }

  async function remover(id) {
    setRemovendo(id);
    try {
      await api.delete(`/motivos-descarte/${id}`);
      setMotivos((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>Motivos de descarte</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6A6A70' }}>
          Lista exibida para o corretor ao marcar um lead como Não Cliente. "Outro" é fixo e não pode ser removido.
        </p>
      </div>

      <form onSubmit={adicionar} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ex: Lead virou cliente de outro produto"
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          maxLength={100}
        />
        <button type="submit" disabled={adicionando || !novoTexto.trim()} className="btn-primary whitespace-nowrap">
          {adicionando ? '...' : '+ Adicionar'}
        </button>
      </form>

      {carregando ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {motivos.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors"
              style={{ borderBottom: '1px solid rgba(244,244,248,0.05)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,244,248,0.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="text-sm" style={{ color: '#A0A0A8' }}>{m.texto}</span>
              <button
                onClick={() => remover(m.id)}
                disabled={removendo === m.id}
                className="transition-colors flex-shrink-0"
                style={{ color: '#2A2A30' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#E74C3C')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#2A2A30')}
                title="Remover"
              >
                {removendo === m.id ? (
                  <i className="ti ti-loader-2 animate-spin text-[16px]" style={{ color: '#E74C3C' }} aria-hidden="true" />
                ) : (
                  <i className="ti ti-trash text-[16px]" aria-hidden="true" />
                )}
              </button>
            </div>
          ))}

          <div
            className="flex items-center justify-between gap-4 px-5 py-3.5"
            style={{ background: '#0A0A0C' }}
          >
            <span className="text-sm italic" style={{ color: '#2A2A30' }}>
              Outro <span className="not-italic text-xs">(fixo — sempre presente)</span>
            </span>
            <i className="ti ti-lock text-[15px]" style={{ color: '#1E1E24' }} aria-hidden="true" />
          </div>

          {motivos.length === 0 && (
            <p className="text-center text-sm py-6 px-5" style={{ color: '#2A2A30' }}>
              Nenhum motivo configurado além de "Outro".
            </p>
          )}
        </div>
      )}
    </div>
  );
}
