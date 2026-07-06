import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ImportarClientesModal from '../components/ImportarClientesModal';

const STATUS_OPTS = ['', 'Prospecto', 'Em negociação', 'Cliente ativo', 'Pós-venda', 'Inativo'];
const ORIGEM_OPTS = ['', 'Indicação', 'Evento', 'Carteira anterior', 'Rede social', 'Outro'];

const BADGE = {
  'Prospecto':       { bg: 'rgba(58,90,200,0.15)', color: '#6C8EF0' },
  'Em negociação':   { bg: 'rgba(192,57,43,0.15)', color: '#E74C3C' },
  'Cliente ativo':   { bg: 'rgba(39,174,96,0.15)', color: '#27AE60' },
  'Pós-venda':       { bg: 'rgba(230,126,34,0.15)', color: '#E67E22' },
  'Inativo':         { bg: 'rgba(58,58,66,0.3)',    color: '#6B6B78' },
};

function Badge({ status }) {
  const s = BADGE[status] || BADGE['Inativo'];
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [modalImportar, setModalImportar] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = {};
      if (busca) params.busca = busca;
      if (filtroStatus) params.status = filtroStatus;
      if (filtroOrigem) params.origem = filtroOrigem;
      const r = await api.get('/clientes', { params });
      setClientes(r.data);
    } catch {}
    setCarregando(false);
  }, [busca, filtroStatus, filtroOrigem]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F4F4F8' }}>Clientes</h1>
          <p className="text-xs mt-0.5" style={{ color: '#3A3A42' }}>
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalImportar(true)}
            className="text-sm px-3 py-1.5 rounded font-medium transition-colors"
            style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8', border: '1px solid rgba(244,244,248,0.08)' }}
          >
            <i className="ti ti-upload mr-1.5" />Importar
          </button>
          <button
            onClick={() => setModalNovo(true)}
            className="text-sm px-3 py-1.5 rounded font-medium"
            style={{ background: '#C0392B', color: '#fff' }}
          >
            <i className="ti ti-plus mr-1.5" />Novo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Buscar por nome, telefone, e-mail…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded outline-none"
          style={{ background: 'rgba(244,244,248,0.05)', color: '#F4F4F8', border: '1px solid rgba(244,244,248,0.08)' }}
        />
        <div className="flex gap-2">
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
            className="flex-1 text-sm px-2 py-2 rounded outline-none"
            style={{ background: 'rgba(244,244,248,0.05)', color: '#F4F4F8', border: '1px solid rgba(244,244,248,0.08)' }}>
            {STATUS_OPTS.map((o) => <option key={o} value={o}>{o || 'Todos os status'}</option>)}
          </select>
          <select value={filtroOrigem} onChange={(e) => setFiltroOrigem(e.target.value)}
            className="flex-1 text-sm px-2 py-2 rounded outline-none"
            style={{ background: 'rgba(244,244,248,0.05)', color: '#F4F4F8', border: '1px solid rgba(244,244,248,0.08)' }}>
            {ORIGEM_OPTS.map((o) => <option key={o} value={o}>{o || 'Todas origens'}</option>)}
          </select>
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-nrc-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#3A3A42' }}>
          <i className="ti ti-users-off text-4xl block mb-3" />
          <p className="text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/clientes/${c.id}`)}
              className="w-full text-left px-4 py-3 rounded-lg transition-colors"
              style={{ background: 'rgba(244,244,248,0.04)', border: '1px solid rgba(244,244,248,0.06)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,244,248,0.07)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(244,244,248,0.04)')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: '#F4F4F8' }}>{c.nome}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#3A3A42' }}>
                    {c.telefone}{c.email ? ` · ${c.email}` : ''}
                  </p>
                  {c.empreendimentoInteresse && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#6B6B78' }}>{c.empreendimentoInteresse}</p>
                  )}
                </div>
                <Badge status={c.statusCarteira} />
              </div>
            </button>
          ))}
        </div>
      )}

      {modalImportar && (
        <ImportarClientesModal
          onClose={() => setModalImportar(false)}
          onImportado={() => { setModalImportar(false); carregar(); }}
        />
      )}

      {modalNovo && (
        <NovoClienteModal
          onClose={() => setModalNovo(false)}
          onCriado={() => { setModalNovo(false); carregar(); }}
        />
      )}
    </div>
  );
}

// Modal inline para criar cliente
function NovoClienteModal({ onClose, onCriado }) {
  const [form, setForm] = useState({
    nome: '', telefone: '', email: '', empreendimentoInteresse: '',
    origemContato: 'Outro', nomeIndicador: '', statusCarteira: 'Prospecto', notas: '',
  });
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.telefone.trim()) return;
    setSalvando(true);
    try {
      await api.post('/clientes', form);
      onCriado();
    } catch { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <form onSubmit={salvar}
        className="w-full max-w-sm rounded-xl p-5 space-y-3"
        style={{ background: '#13131A', border: '1px solid rgba(244,244,248,0.08)' }}
        onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-base" style={{ color: '#F4F4F8' }}>Novo cliente</h2>

        {[
          ['Nome *', 'nome', 'text'],
          ['Telefone *', 'telefone', 'tel'],
          ['E-mail', 'email', 'email'],
          ['Empreendimento de interesse', 'empreendimentoInteresse', 'text'],
        ].map(([label, key, type]) => (
          <div key={key}>
            <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>{label}</label>
            <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)}
              className="w-full text-sm px-3 py-2 rounded outline-none"
              style={{ background: 'rgba(244,244,248,0.05)', color: '#F4F4F8', border: '1px solid rgba(244,244,248,0.08)' }} />
          </div>
        ))}

        <div>
          <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Origem do contato</label>
          <select value={form.origemContato} onChange={(e) => set('origemContato', e.target.value)}
            className="w-full text-sm px-3 py-2 rounded outline-none"
            style={{ background: 'rgba(244,244,248,0.05)', color: '#F4F4F8', border: '1px solid rgba(244,244,248,0.08)' }}>
            {ORIGEM_OPTS.filter(Boolean).map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        {form.origemContato === 'Indicação' && (
          <div>
            <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Indicado por</label>
            <input type="text" value={form.nomeIndicador} onChange={(e) => set('nomeIndicador', e.target.value)}
              className="w-full text-sm px-3 py-2 rounded outline-none"
              style={{ background: 'rgba(244,244,248,0.05)', color: '#F4F4F8', border: '1px solid rgba(244,244,248,0.08)' }} />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: 'rgba(244,244,248,0.06)', color: '#F4F4F8' }}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="flex-1 text-sm py-2 rounded font-medium"
            style={{ background: '#C0392B', color: '#fff', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
