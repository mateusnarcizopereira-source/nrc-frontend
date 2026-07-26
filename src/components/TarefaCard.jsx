import { Link } from 'react-router-dom';

export const TIPO_META = {
  'Ligar':    { icon: 'phone' },
  'WhatsApp': { icon: 'brand-whatsapp' },
  'E-mail':   { icon: 'mail' },
  'Visita':   { icon: 'map-pin' },
  'Outro':    { icon: 'checkbox' },
};
export const TIPOS = Object.keys(TIPO_META);

export function isoParaInputLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
export function inputLocalParaIso(val) {
  if (!val) return null;
  return new Date(val).toISOString();
}

export function estaAtrasada(t) {
  return t.status === 'Pendente' && t.dataHora && new Date(t.dataHora) < new Date();
}

function fmtData(iso) {
  if (!iso) return 'Sem data';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function TarefaCard({ tarefa, onConcluir, onEditar, onCancelar, podeEditar, mostrarLead = false, modoSolo = false }) {
  const meta = TIPO_META[tarefa.tipo] || TIPO_META['Outro'];
  const atrasada = estaAtrasada(tarefa);
  const concluida = tarefa.status === 'Concluída';
  const cancelada = tarefa.status === 'Cancelada';

  return (
    <div className="card" style={{ opacity: cancelada ? 0.55 : 1 }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: concluida ? 'rgba(39,174,96,0.12)' : atrasada ? 'rgba(192,57,43,0.12)' : 'rgba(244,244,248,0.05)' }}>
          <i className={`ti ti-${concluida ? 'check' : meta.icon} text-[16px]`}
            style={{ color: concluida ? '#27AE60' : atrasada ? '#E74C3C' : '#6A6A70' }} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm" style={{ color: '#F4F4F8', textDecoration: concluida || cancelada ? 'line-through' : 'none' }}>
              {tarefa.titulo}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(244,244,248,0.05)', color: '#6A6A70' }}>{tarefa.tipo}</span>
            {atrasada && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(192,57,43,0.15)', color: '#E74C3C' }}>Atrasada</span>
            )}
          </div>

          {mostrarLead && tarefa.leadId && (
            <Link to={`/leads/${tarefa.leadId}`} className="text-xs" style={{ color: '#C0392B' }}>
              {tarefa.leadNome || 'Ver lead'}
            </Link>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs" style={{ color: atrasada ? '#E74C3C' : '#4A4A52' }}>
            <span><i className="ti ti-clock mr-1" aria-hidden="true" />{fmtData(tarefa.dataHora)}</span>
            {!modoSolo && tarefa.responsavelNome && (
              <span style={{ color: '#4A4A52' }}><i className="ti ti-user mr-1" aria-hidden="true" />{tarefa.responsavelNome}</span>
            )}
          </div>

          {tarefa.descricao && (
            <p className="text-xs mt-1" style={{ color: '#6A6A70' }}>{tarefa.descricao}</p>
          )}

          {concluida && tarefa.resultado && (
            <p className="text-xs mt-1 p-2 rounded" style={{ background: 'rgba(39,174,96,0.06)', color: '#8FceA8' }}>
              <span style={{ color: '#4A4A52' }}>Resultado: </span>{tarefa.resultado}
            </p>
          )}

          {/* Ações */}
          {podeEditar && tarefa.status === 'Pendente' && (
            <div className="flex gap-2 mt-2.5">
              <button onClick={() => onConcluir(tarefa)}
                className="text-xs px-3 py-1.5 rounded font-medium"
                style={{ background: 'rgba(39,174,96,0.12)', color: '#27AE60' }}>
                <i className="ti ti-check mr-1" aria-hidden="true" />Concluir
              </button>
              <button onClick={() => onEditar(tarefa)}
                className="text-xs px-2.5 py-1.5 rounded" style={{ color: '#6A6A70' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F4F4F8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6A6A70')}>
                <i className="ti ti-pencil" aria-hidden="true" />
              </button>
              <button onClick={() => onCancelar(tarefa)}
                className="text-xs px-2.5 py-1.5 rounded" style={{ color: '#6A6A70' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#E74C3C')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6A6A70')}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
