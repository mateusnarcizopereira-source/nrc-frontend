import { useState, useEffect } from 'react';
import api from '../services/api';

function Toggle({ ativo, onChange, carregando }) {
  return (
    <button type="button" onClick={() => onChange(!ativo)} disabled={carregando} aria-pressed={ativo}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', border: 'none', padding: '3px',
        background: ativo ? 'var(--accent)' : 'var(--surface-4)', transition: 'background 0.2s',
        flexShrink: 0, cursor: carregando ? 'wait' : 'pointer',
      }}>
      <span style={{
        display: 'block', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--surface)',
        transform: ativo ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s',
      }} />
    </button>
  );
}

// GOD Painel — liga/desliga se um corretor recebe leads novos de um
// empreendimento específico na distribuição automática. Não tira ele do
// sistema nem da fila de hoje, só pausa o rodízio DESSE empreendimento —
// ver sorteioService.proximoCorretor(empreendimentoId) no backend.
export default function PausasDistribuicaoPainel() {
  const [corretores, setCorretores] = useState([]);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [corretorId, setCorretorId] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState(null); // empreendimentoId em voo, pra desabilitar só aquele toggle
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api.get('/corretores'), api.get('/empreendimentos')])
      .then(([rc, re]) => {
        const ativos = rc.data.filter((c) => c.ativo);
        setCorretores(ativos);
        setEmpreendimentos(re.data.filter((e) => e.ativo !== false));
        if (ativos.length) setCorretorId(ativos[0].id);
      })
      .catch(() => setErro('Não foi possível carregar corretores/empreendimentos.'))
      .finally(() => setCarregando(false));
  }, []);

  const corretor = corretores.find((c) => c.id === corretorId);
  const pausas = corretor?.pausasDistribuicao || {};

  async function alternar(empreendimentoId, pausadoAgora) {
    setSalvandoId(empreendimentoId);
    setErro('');
    try {
      const r = await api.patch(`/usuarios/${corretorId}/pausas-distribuicao`, {
        empreendimentoId, pausado: !pausadoAgora,
      });
      setCorretores((prev) => prev.map((c) => (c.id === corretorId ? { ...c, pausasDistribuicao: r.data.pausasDistribuicao } : c)));
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar.');
    }
    setSalvandoId(null);
  }

  if (carregando) {
    return (
      <div className="card"><div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div></div>
    );
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-bold" style={{ color: 'var(--text)' }}>Distribuição por empreendimento</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Pausa um corretor específico de receber leads NOVOS de um empreendimento, sem tirá-lo do sistema —
          continua recebendo normalmente dos outros. Leads já atribuídos não são afetados.
        </p>
      </div>

      {corretores.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Nenhum corretor ativo.</p>
      ) : (
        <>
          <select value={corretorId} onChange={(e) => setCorretorId(e.target.value)}
            className="w-full sm:w-auto text-sm px-3 py-2 rounded outline-none"
            style={{ background: 'rgba(var(--ink-rgb), 0.05)', color: 'var(--text)', border: '1px solid rgba(var(--ink-rgb), 0.08)' }}>
            {corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          {empreendimentos.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum empreendimento cadastrado.</p>
          ) : (
            <div className="space-y-1">
              {empreendimentos.map((e) => {
                const pausado = Boolean(pausas[e.id]);
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2"
                    style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{e.nome}</p>
                      <p className="text-xs" style={{ color: pausado ? 'var(--warning)' : 'var(--text-faint)' }}>
                        {pausado ? 'Pausado — não recebe leads novos deste' : 'Recebendo leads normalmente'}
                      </p>
                    </div>
                    <Toggle ativo={!pausado} carregando={salvandoId === e.id}
                      onChange={() => alternar(e.id, pausado)} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {erro && <p className="text-xs" style={{ color: 'var(--accent)' }}>{erro}</p>}
    </div>
  );
}
