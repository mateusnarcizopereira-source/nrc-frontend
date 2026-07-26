import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../services/api';
import TarefaCard from '../components/TarefaCard';
import { TarefaFormModal, ConcluirTarefaModal } from '../components/TarefaModais';

function agrupar(tarefas) {
  const agora = new Date();
  const hojeFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  const em7 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 7);

  const grupos = { atrasadas: [], hoje: [], semana: [], depois: [] };
  for (const t of tarefas) {
    if (!t.dataHora) { grupos.depois.push(t); continue; }
    const d = new Date(t.dataHora);
    if (d < agora) grupos.atrasadas.push(t);
    else if (d < hojeFim) grupos.hoje.push(t);
    else if (d < em7) grupos.semana.push(t);
    else grupos.depois.push(t);
  }
  return grupos;
}

const SECOES = [
  { key: 'atrasadas', label: 'Atrasadas', cor: '#E74C3C' },
  { key: 'hoje',      label: 'Hoje',      cor: '#E67E22' },
  { key: 'semana',    label: 'Esta semana', cor: '#4a6fa5' },
  { key: 'depois',    label: 'Depois',    cor: '#6A6A70' },
];

export default function Tarefas() {
  const { usuario } = useAuth();
  const { modoSolo } = useConfig();
  const podeEditar = ['corretor', 'gerente', 'editor'].includes(usuario?.perfil);

  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalForm, setModalForm] = useState(null);   // { tarefa?, leadIdFixo?, leadNomeFixo? }
  const [modalConcluir, setModalConcluir] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api.get('/tarefas', { params: { status: 'Pendente' } });
      setTarefas(r.data);
    } catch {}
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function cancelar(t) {
    if (!window.confirm(`Cancelar a tarefa "${t.titulo}"?`)) return;
    try { await api.post(`/tarefas/${t.id}/cancelar`); carregar(); } catch {}
  }

  function aoConcluir({ criarProxima }) {
    const t = modalConcluir;
    setModalConcluir(null);
    carregar();
    if (criarProxima && t) setModalForm({ leadIdFixo: t.leadId, leadNomeFixo: t.leadNome });
  }

  const grupos = agrupar(tarefas);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>Tarefas</h1>
          <p className="text-sm" style={{ color: '#6A6A70' }}>
            {tarefas.length} pendente{tarefas.length !== 1 ? 's' : ''}
            {grupos.atrasadas.length > 0 && (
              <span style={{ color: '#E74C3C' }}> · {grupos.atrasadas.length} atrasada{grupos.atrasadas.length !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        {podeEditar && (
          <button onClick={() => setModalForm({})} className="btn-primary text-sm whitespace-nowrap">
            <i className="ti ti-plus mr-1.5" aria-hidden="true" />Nova
          </button>
        )}
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tarefas.length === 0 ? (
        <div className="card text-center py-12">
          <i className="ti ti-checklist text-4xl block mb-3" style={{ color: '#3A3A42' }} />
          <p style={{ color: '#3A3A42' }}>Nenhuma tarefa pendente.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {SECOES.map(({ key, label, cor }) => (
            grupos[key].length > 0 && (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: cor }} />
                  <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: cor }}>
                    {label}
                  </h2>
                  <span className="text-xs" style={{ color: '#3A3A42' }}>({grupos[key].length})</span>
                </div>
                <div className="space-y-2">
                  {grupos[key].map((t) => (
                    <TarefaCard
                      key={t.id}
                      tarefa={t}
                      podeEditar={podeEditar}
                      mostrarLead
                      modoSolo={modoSolo}
                      onConcluir={setModalConcluir}
                      onEditar={(tar) => setModalForm({ tarefa: tar })}
                      onCancelar={cancelar}
                    />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {modalForm && (
        <TarefaFormModal
          tarefa={modalForm.tarefa}
          leadIdFixo={modalForm.leadIdFixo}
          leadNomeFixo={modalForm.leadNomeFixo}
          usuario={usuario}
          modoSolo={modoSolo}
          onClose={() => setModalForm(null)}
          onSalvo={() => { setModalForm(null); carregar(); }}
        />
      )}

      {modalConcluir && (
        <ConcluirTarefaModal
          tarefa={modalConcluir}
          onClose={() => setModalConcluir(null)}
          onConcluido={aoConcluir}
        />
      )}
    </div>
  );
}
