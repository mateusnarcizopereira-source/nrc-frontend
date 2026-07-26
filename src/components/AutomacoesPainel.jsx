import { useState, useEffect } from 'react';
import api from '../services/api';

function Toggle({ ativo, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!ativo)} aria-pressed={ativo}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', border: 'none', padding: '3px',
        background: ativo ? '#C0392B' : '#1E1E24', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer',
      }}>
      <span style={{
        display: 'block', width: '18px', height: '18px', borderRadius: '50%', background: '#F4F4F8',
        transform: ativo ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s',
      }} />
    </button>
  );
}

function LinhaRegra({ titulo, descricao, ativo, onToggle, children }) {
  return (
    <div className="py-3" style={{ borderTop: '1px solid rgba(244,244,248,0.06)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-sm" style={{ color: '#F4F4F8' }}>{titulo}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6A6A70' }}>{descricao}</p>
        </div>
        <Toggle ativo={ativo} onChange={onToggle} />
      </div>
      {ativo && <div className="mt-2.5 pl-1">{children}</div>}
    </div>
  );
}

function NumInput({ valor, onChange, sufixo }) {
  return (
    <span className="inline-flex items-center gap-2">
      <input type="number" min={1} value={valor}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="input" style={{ width: '80px' }} />
      <span className="text-xs" style={{ color: '#6A6A70' }}>{sufixo}</span>
    </span>
  );
}

function resumoExec(e) {
  const partes = [];
  if (e.esfriados) partes.push(`${e.esfriados} esfriado(s)`);
  if (e.alertasParado) partes.push(`${e.alertasParado} alerta(s)`);
  if (e.reativados) partes.push(`${e.reativados} reativado(s)`);
  if (e.primeirosContatos) partes.push(`${e.primeirosContatos} 1º contato(s)`);
  if (e.tarefasVencendo) partes.push(`${e.tarefasVencendo} venc.`);
  if (e.tarefasAtrasadas) partes.push(`${e.tarefasAtrasadas} atras.`);
  const sorteios = (e.sorteios || []).filter((s) => s.criada).length;
  if (sorteios) partes.push(`${sorteios} sorteio(s)`);
  return partes.length ? partes.join(' · ') : 'nada a fazer';
}

export default function AutomacoesPainel() {
  const [cfg, setCfg] = useState(null);
  const [motivos, setMotivos] = useState([]);
  const [execucoes, setExecucoes] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/automacoes/config').then((r) => setCfg(r.data)).catch(() => {});
    api.get('/motivos-descarte').then((r) => setMotivos(r.data)).catch(() => {});
    carregarLog();
  }, []);

  function carregarLog() {
    api.get('/automacoes/execucoes').then((r) => setExecucoes(r.data)).catch(() => {});
  }

  const set = (regra, campo, valor) =>
    setCfg((c) => ({ ...c, [regra]: { ...c[regra], [campo]: valor } }));

  function toggleMotivo(texto) {
    setCfg((c) => {
      const atual = c.reativarDescartado.motivosReativaveis || [];
      const novo = atual.includes(texto) ? atual.filter((m) => m !== texto) : [...atual, texto];
      return { ...c, reativarDescartado: { ...c.reativarDescartado, motivosReativaveis: novo } };
    });
  }

  async function salvar() {
    setSalvando(true); setMsg('');
    try {
      await api.put('/automacoes/config', cfg);
      setMsg('Configuração de automações salva.');
    } catch {
      setMsg('Erro ao salvar.');
    } finally { setSalvando(false); }
  }

  if (!cfg) return null;

  return (
    <>
      <div className="card">
        <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Automações</h2>
        <p className="text-xs mt-1" style={{ color: '#6A6A70' }}>
          Rodam pelo cron a cada ~10min. Toda ação automática é registrada na timeline como "Sistema".
        </p>

        <LinhaRegra
          titulo="Auto-esfriamento"
          descricao="Lead sem interação cai um estágio de temperatura."
          ativo={cfg.autoEsfriamento.ativo}
          onToggle={(v) => set('autoEsfriamento', 'ativo', v)}>
          <NumInput valor={cfg.autoEsfriamento.dias} onChange={(v) => set('autoEsfriamento', 'dias', v)} sufixo="dias sem interação" />
        </LinhaRegra>

        <LinhaRegra
          titulo="Alerta de lead parado"
          descricao="Notifica o corretor responsável sobre lead sem interação."
          ativo={cfg.alertaParado.ativo}
          onToggle={(v) => set('alertaParado', 'ativo', v)}>
          <NumInput valor={cfg.alertaParado.dias} onChange={(v) => set('alertaParado', 'dias', v)} sufixo="dias sem interação" />
        </LinhaRegra>

        <LinhaRegra
          titulo="Reativar descartado"
          descricao="Lead descartado há muito tempo, com motivo reativável, volta ao funil."
          ativo={cfg.reativarDescartado.ativo}
          onToggle={(v) => set('reativarDescartado', 'ativo', v)}>
          <div className="space-y-2">
            <NumInput valor={cfg.reativarDescartado.dias} onChange={(v) => set('reativarDescartado', 'dias', v)} sufixo="dias após descarte" />
            <div>
              <p className="text-xs mb-1.5" style={{ color: '#4A4A52' }}>Motivos reativáveis:</p>
              {motivos.length === 0 ? (
                <p className="text-xs" style={{ color: '#3A3A42' }}>Nenhum motivo de descarte cadastrado.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {motivos.map((m) => {
                    const on = (cfg.reativarDescartado.motivosReativaveis || []).includes(m.texto);
                    return (
                      <button key={m.id} type="button" onClick={() => toggleMotivo(m.texto)}
                        className="px-2.5 py-1 text-xs rounded-full transition-colors"
                        style={on
                          ? { background: 'rgba(46,204,113,0.15)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.4)' }
                          : { background: 'transparent', color: '#4A4A52', border: '1px solid rgba(244,244,248,0.10)' }}>
                        {on ? '✓ ' : ''}{m.texto}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </LinhaRegra>

        <LinhaRegra
          titulo='Tarefa "Primeiro contato" em lead novo'
          descricao="Cria uma tarefa de primeiro contato ao receber um lead."
          ativo={cfg.primeiroContato.ativo}
          onToggle={(v) => set('primeiroContato', 'ativo', v)}>
          <NumInput valor={cfg.primeiroContato.minutos} onChange={(v) => set('primeiroContato', 'minutos', v)} sufixo="minutos após receber" />
        </LinhaRegra>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={salvar} disabled={salvando} className="btn-primary">
            {salvando ? 'Salvando...' : 'Salvar automações'}
          </button>
          {msg && <span className="text-sm" style={{ color: msg.startsWith('Erro') ? '#E74C3C' : '#2ECC71' }}>{msg}</span>}
        </div>
      </div>

      {/* Log de execuções */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold" style={{ color: '#F4F4F8' }}>Log de automações</h2>
          <button onClick={carregarLog} className="text-xs px-2 py-1 rounded" style={{ color: '#6A6A70' }}>
            <i className="ti ti-refresh mr-1" aria-hidden="true" />Atualizar
          </button>
        </div>
        {execucoes.length === 0 ? (
          <p className="text-sm py-3 text-center" style={{ color: '#3A3A42' }}>
            Nenhuma execução registrada ainda (o cron grava aqui a cada rodada).
          </p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {execucoes.map((e, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-xs py-1.5"
                style={{ borderBottom: '1px solid rgba(244,244,248,0.04)' }}>
                <span style={{ color: '#4A4A52' }}>
                  {new Date(e.rodadoEm || e.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-right flex-1" style={{ color: '#A0A0A8' }}>{resumoExec(e)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
