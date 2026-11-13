import { useEffect, useState } from 'react';
import api from '../services/api';
import BadgeStatus from './BadgeStatus';

// Leads por estágio do funil, com filtro por empreendimento. O backend só devolve números e só os empreendimentos que esta
// conta pode ver; a lista do filtro vem da própria resposta.
export default function RelatorioFunil() {
  const [empreendimentoId, setEmpreendimentoId] = useState('');
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true); setErro('');
    api.get('/relatorios/funil', { params: empreendimentoId ? { empreendimentoId } : {} })
      .then((r) => setDados(r.data))
      .catch((e) => setErro(e.response?.data?.erro || 'Não foi possível carregar o funil.'))
      .finally(() => setCarregando(false));
  }, [empreendimentoId]);

  const maior = Math.max(1, ...(dados?.porEstagio || []).map((e) => e.quantidade));

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold" style={{ color: 'var(--text)' }}>Funil por estágio</h2>
        <select value={empreendimentoId} onChange={(e) => setEmpreendimentoId(e.target.value)} aria-label="Filtrar por empreendimento"
          className="text-sm rounded px-2 py-1.5" style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid rgba(var(--ink-rgb), 0.12)' }}>
          <option value="">Todos os empreendimentos</option>
          {(dados?.empreendimentos || []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>
      {erro && <p className="text-sm" style={{ color: 'var(--accent-hover)' }}>{erro}</p>}
      {carregando && !dados ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando…</p> : dados && (
        <>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {dados.ativos} lead(s) ativos · {dados.descartados} não cliente(s)
          </p>
          <div className="space-y-2">
            {dados.porEstagio.map((e) => (
              <div key={e.status} className="flex items-center gap-3 text-sm">
                <div className="w-48 flex-shrink-0"><BadgeStatus status={e.status} /></div>
                <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(var(--ink-rgb), 0.06)' }}>
                  <div className="h-2 rounded-full" style={{ width: `${(e.quantidade / maior) * 100}%`, background: 'var(--accent)' }} />
                </div>
                <span className="w-10 text-right font-semibold" style={{ color: 'var(--text)' }}>{e.quantidade}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
