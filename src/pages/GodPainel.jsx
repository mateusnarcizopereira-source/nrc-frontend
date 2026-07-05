import { useState, useEffect } from 'react';
import api from '../services/api';

export default function GodPainel() {
  const [config, setConfig] = useState(null);
  const [fila, setFila] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simMsg, setSimMsg] = useState('');
  const [sorteioLoading, setSorteioLoading] = useState(false);
  const [periodo, setPeriodo] = useState('manual');

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    const [configRes, filaRes] = await Promise.all([
      api.get('/sorteio/config'),
      api.get('/sorteio/fila').catch(() => ({ data: null })),
    ]);
    setConfig(configRes.data);
    setFila(filaRes.data);
  }

  async function salvarConfig() {
    await api.put('/sorteio/config', config);
    alert('Configuração salva e agendador atualizado!');
  }

  async function dispararSorteio() {
    setSorteioLoading(true);
    try {
      const res = await api.post('/sorteio/disparar', { periodo });
      setFila(res.data);
      alert(`Sorteio "${periodo}" realizado com sucesso!`);
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao disparar sorteio.');
    } finally {
      setSorteioLoading(false);
    }
  }

  async function simularLead() {
    setSimLoading(true);
    setSimMsg('');
    try {
      const res = await api.post('/webhook/meta-leads/simular', {});
      setSimMsg(`Lead criado: ${res.data.lead.nome} → ${res.data.lead.corretorNome || 'fila de espera'}`);
    } catch (e) {
      setSimMsg('Erro ao simular lead: ' + (e.response?.data?.erro || e.message));
    } finally {
      setSimLoading(false);
    }
  }

  function atualizarHorario(idx, campo, valor) {
    const novos = [...config.horarios];
    novos[idx] = { ...novos[idx], [campo]: valor };
    setConfig({ ...config, horarios: novos });
  }

  function adicionarHorario() {
    setConfig({ ...config, horarios: [...config.horarios, { label: 'novo', hora: '10:00' }] });
  }

  function removerHorario(idx) {
    const novos = config.horarios.filter((_, i) => i !== idx);
    setConfig({ ...config, horarios: novos });
  }

  if (!config) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>GOD Painel</h1>
        <p className="text-sm" style={{ color: '#6A6A70' }}>Controle total do sistema NRC</p>
      </div>

      {/* Configuração de sorteios */}
      <div className="card space-y-4">
        <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Horários dos sorteios</h2>
        {config.horarios.map((h, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              className="input w-32"
              placeholder="Label (ex: manha)"
              value={h.label}
              onChange={(e) => atualizarHorario(i, 'label', e.target.value)}
            />
            <input
              type="time"
              className="input w-32"
              value={h.hora}
              onChange={(e) => atualizarHorario(i, 'hora', e.target.value)}
            />
            <button
              onClick={() => removerHorario(i)}
              className="text-sm font-medium transition-colors"
              style={{ color: '#E74C3C' }}
            >
              Remover
            </button>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button onClick={adicionarHorario} className="btn-secondary text-sm">+ Horário</button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm" style={{ color: '#A0A0A8' }}>
            <input
              type="checkbox"
              checked={config.distribuicaoAtiva}
              onChange={(e) => setConfig({ ...config, distribuicaoAtiva: e.target.checked })}
              className="rounded accent-[#C0392B]"
            />
            Distribuição automática ativa
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: '#A0A0A8' }}>Tolerância (min):</label>
          <input
            type="number"
            className="input w-24"
            value={config.toleranciaMinutos}
            onChange={(e) => setConfig({ ...config, toleranciaMinutos: parseInt(e.target.value) })}
            min={0}
          />
        </div>

        <button onClick={salvarConfig} className="btn-primary">Salvar configuração</button>
      </div>

      {/* Sorteio manual */}
      <div className="card space-y-3">
        <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Disparar sorteio manualmente</h2>
        <div className="flex items-center gap-3">
          <input
            className="input w-40"
            placeholder="Período (ex: manha)"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
          <button onClick={dispararSorteio} disabled={sorteioLoading} className="btn-primary">
            {sorteioLoading ? 'Sorteando...' : 'Disparar sorteio'}
          </button>
        </div>

        {fila && fila.ordem && (
          <div>
            <p className="text-sm mb-2" style={{ color: '#6A6A70' }}>Fila atual — {fila.periodo}:</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const pos = fila.posicaoAtual % fila.ordem.length;
                return [...fila.ordem.slice(pos), ...fila.ordem.slice(0, pos)].map((c, i) => (
                  <div
                    key={c.corretorId}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={
                      i === 0
                        ? { background: '#C0392B', color: '#fff' }
                        : { background: '#141418', color: '#6A6A70' }
                    }
                  >
                    #{i + 1} {c.corretorNome}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Simulador de lead */}
      <div className="card space-y-3">
        <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Simulador de lead Meta</h2>
        <p className="text-sm" style={{ color: '#6A6A70' }}>
          Injeta um lead fake como se viesse do Meta Lead Ads, para testar o fluxo de ponta a ponta.
        </p>
        <button onClick={simularLead} disabled={simLoading} className="btn-secondary">
          {simLoading ? 'Simulando...' : '⚡ Simular lead'}
        </button>
        {simMsg && (
          <p
            className="text-sm font-medium"
            style={{ color: simMsg.startsWith('Erro') ? '#E74C3C' : '#2ECC71' }}
          >
            {simMsg}
          </p>
        )}
      </div>
    </div>
  );
}
