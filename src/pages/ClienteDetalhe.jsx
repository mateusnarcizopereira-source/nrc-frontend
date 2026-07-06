import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_OPTS = ['Prospecto', 'Em negociação', 'Cliente ativo', 'Pós-venda', 'Inativo'];
const ORIGEM_OPTS = ['Indicação', 'Evento', 'Carteira anterior', 'Rede social', 'Outro'];

export default function ClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [novoComentario, setNovoComentario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const [rC, rCom] = await Promise.all([
        api.get(`/clientes/${id}`),
        api.get(`/clientes/${id}/comentarios`),
      ]);
      setCliente(rC.data);
      setForm(rC.data);
      setComentarios(rCom.data);
    } catch { navigate('/clientes', { replace: true }); }
    setCarregando(false);
  }, [id, navigate]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarEdicao(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const r = await api.put(`/clientes/${id}`, form);
      setCliente(r.data);
      setEditando(false);
    } catch {}
    setSalvando(false);
  }

  async function enviarComentario(e) {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    try {
      const r = await api.post(`/clientes/${id}/comentarios`, { texto: novoComentario });
      setComentarios([r.data, ...comentarios]);
      setNovoComentario('');
    } catch {}
  }

  async function deletar() {
    if (!window.confirm('Excluir este cliente permanentemente?')) return;
    await api.delete(`/clientes/${id}`);
    navigate('/clientes', { replace: true });
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (carregando) return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-2 border-nrc-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!cliente) return null;

  const inputStyle = {
    background: 'rgba(244,244,248,0.05)', color: '#F4F4F8',
    border: '1px solid rgba(244,244,248,0.08)',
  };

  return (
    <div className="space-y-5">
      {/* Voltar */}
      <button onClick={() => navigate('/clientes')}
        className="flex items-center gap-1.5 text-sm"
        style={{ color: '#3A3A42' }}>
        <i className="ti ti-arrow-left" />Clientes
      </button>

      {/* Card principal */}
      <div className="rounded-xl p-5 space-y-4"
        style={{ background: 'rgba(244,244,248,0.04)', border: '1px solid rgba(244,244,248,0.06)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#F4F4F8' }}>{cliente.nome}</h1>
            <p className="text-sm mt-0.5" style={{ color: '#3A3A42' }}>{cliente.statusCarteira}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditando(!editando)}
              className="text-xs px-3 py-1.5 rounded font-medium"
              style={{ background: editando ? 'rgba(192,57,43,0.15)' : 'rgba(244,244,248,0.06)', color: editando ? '#E74C3C' : '#F4F4F8' }}>
              {editando ? 'Cancelar' : 'Editar'}
            </button>
            <button onClick={deletar}
              className="text-xs px-2 py-1.5 rounded"
              style={{ background: 'rgba(192,57,43,0.1)', color: '#E74C3C' }}>
              <i className="ti ti-trash" />
            </button>
          </div>
        </div>

        {editando ? (
          <form onSubmit={salvarEdicao} className="space-y-3">
            {[
              ['Nome', 'nome'], ['Telefone', 'telefone'], ['E-mail', 'email'],
              ['Empreendimento de interesse', 'empreendimentoInteresse'],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>{label}</label>
                <input type="text" value={form[key] || ''} onChange={(e) => set(key, e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Status</label>
                <select value={form.statusCarteira} onChange={(e) => set('statusCarteira', e.target.value)}
                  className="w-full text-sm px-2 py-2 rounded outline-none" style={inputStyle}>
                  {STATUS_OPTS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Origem</label>
                <select value={form.origemContato} onChange={(e) => set('origemContato', e.target.value)}
                  className="w-full text-sm px-2 py-2 rounded outline-none" style={inputStyle}>
                  {ORIGEM_OPTS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {form.origemContato === 'Indicação' && (
              <div>
                <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Indicado por</label>
                <input type="text" value={form.nomeIndicador || ''} onChange={(e) => set('nomeIndicador', e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded outline-none" style={inputStyle} />
              </div>
            )}
            <div>
              <label className="text-xs block mb-1" style={{ color: '#3A3A42' }}>Notas</label>
              <textarea value={form.notas || ''} onChange={(e) => set('notas', e.target.value)} rows={3}
                className="w-full text-sm px-3 py-2 rounded outline-none resize-none" style={inputStyle} />
            </div>
            <button type="submit" disabled={salvando}
              className="w-full text-sm py-2 rounded font-medium"
              style={{ background: '#C0392B', color: '#fff', opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </form>
        ) : (
          <div className="space-y-2 text-sm">
            {[
              ['Telefone', cliente.telefone], ['E-mail', cliente.email],
              ['Empreendimento', cliente.empreendimentoInteresse],
              ['Origem', cliente.origemContato],
              ['Indicado por', cliente.nomeIndicador],
              ['Notas', cliente.notas],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span style={{ color: '#3A3A42', minWidth: 100 }}>{label}</span>
                <span style={{ color: '#F4F4F8' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comentários / Timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: '#F4F4F8' }}>Histórico</h2>

        <form onSubmit={enviarComentario} className="flex gap-2">
          <input
            type="text"
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            placeholder="Adicionar anotação…"
            className="flex-1 text-sm px-3 py-2 rounded outline-none"
            style={{ background: 'rgba(244,244,248,0.05)', color: '#F4F4F8', border: '1px solid rgba(244,244,248,0.08)' }}
          />
          <button type="submit"
            className="text-sm px-3 py-2 rounded font-medium"
            style={{ background: '#C0392B', color: '#fff' }}>
            <i className="ti ti-send" />
          </button>
        </form>

        {comentarios.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: '#3A3A42' }}>Nenhuma anotação ainda</p>
        ) : (
          <div className="space-y-2">
            {comentarios.map((c) => (
              <div key={c.id} className="px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(244,244,248,0.04)', border: '1px solid rgba(244,244,248,0.05)' }}>
                <p className="text-sm" style={{ color: '#F4F4F8' }}>{c.texto}</p>
                <p className="text-[11px] mt-1" style={{ color: '#3A3A42' }}>
                  {c.autorNome} · {new Date(c.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
