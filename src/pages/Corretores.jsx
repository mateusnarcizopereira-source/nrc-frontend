import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const PERFIS = ['corretor', 'operador', 'gerente', 'diretor', 'editor'];

export default function Corretores() {
  const { temPerfil } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', perfil: 'corretor', senha: '' });
  const [erro, setErro] = useState('');

  useEffect(() => { carregarUsuarios(); }, []);

  async function carregarUsuarios() {
    const res = await api.get('/usuarios');
    setUsuarios(res.data);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    try {
      await api.post('/usuarios', form);
      setModal(false);
      setForm({ nome: '', email: '', perfil: 'corretor', senha: '' });
      carregarUsuarios();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao criar usuário.');
    }
  }

  async function toggleAtivo(u) {
    await api.patch(`/usuarios/${u.id}`, { ativo: !u.ativo });
    carregarUsuarios();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: '#F4F4F8' }}>Usuários</h1>
        {temPerfil('editor') && (
          <button onClick={() => setModal(true)} className="btn-primary">+ Novo usuário</button>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead style={{ background: '#0A0A0C', borderBottom: '1px solid rgba(244,244,248,0.06)' }}>
            <tr>
              {['Nome', 'E-mail', 'Perfil', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#3A3A42' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr
                key={u.id}
                style={{ borderBottom: '1px solid rgba(244,244,248,0.04)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,244,248,0.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-4 py-3 font-medium" style={{ color: '#F4F4F8' }}>{u.nome}</td>
                <td className="px-4 py-3" style={{ color: '#6A6A70' }}>{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className="badge capitalize"
                    style={{ background: 'rgba(192,57,43,0.12)', color: '#E74C3C' }}
                  >
                    {u.perfil}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="badge"
                    style={
                      u.ativo
                        ? { background: 'rgba(46,204,113,0.10)', color: '#2ECC71' }
                        : { background: 'rgba(192,57,43,0.10)', color: '#C0392B' }
                    }
                  >
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {temPerfil('editor') && (
                    <button
                      onClick={() => toggleAtivo(u)}
                      className="text-xs underline transition-colors"
                      style={{ color: '#3A3A42' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#E74C3C')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#3A3A42')}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div
            className="w-full max-w-md p-6 rounded"
            style={{ background: '#0D0D0F', border: '1px solid rgba(244,244,248,0.08)' }}
          >
            <h2 className="font-bold text-lg mb-4" style={{ color: '#F4F4F8' }}>Novo usuário</h2>
            <form onSubmit={salvar} className="space-y-3">
              {[
                { label: 'Nome', key: 'nome', type: 'text' },
                { label: 'E-mail', key: 'email', type: 'email' },
                { label: 'Senha', key: 'senha', type: 'password' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#6A6A70' }}>{label}</label>
                  <input
                    type={type}
                    className="input"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required
                    minLength={key === 'senha' ? 6 : undefined}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#6A6A70' }}>Perfil</label>
                <select
                  className="input"
                  value={form.perfil}
                  onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                >
                  {PERFIS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
              {erro && <p className="text-sm" style={{ color: '#E74C3C' }}>{erro}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">Criar</button>
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
