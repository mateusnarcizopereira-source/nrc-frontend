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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Usuários</h1>
        {temPerfil('editor') && (
          <button onClick={() => setModal(true)} className="btn-primary">+ Novo usuário</button>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--surface-4)', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
            <tr>
              {['Nome', 'E-mail', 'Perfil', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
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
                style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{u.nome}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-tertiary)' }}>{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className="badge capitalize"
                    style={{ background: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--accent-hover)' }}
                  >
                    {u.perfil}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="badge"
                    style={
                      u.ativo
                        ? { background: 'rgba(var(--success-rgb), 0.10)', color: 'var(--success)' }
                        : { background: 'rgba(var(--accent-rgb), 0.10)', color: 'var(--accent)' }
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
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
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
            style={{ background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.08)' }}
          >
            <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text)' }}>Novo usuário</h2>
            <form onSubmit={salvar} className="space-y-3">
              {[
                { label: 'Nome', key: 'nome', type: 'text' },
                { label: 'E-mail', key: 'email', type: 'email' },
                { label: 'Senha', key: 'senha', type: 'password' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
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
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Perfil</label>
                <select
                  className="input"
                  value={form.perfil}
                  onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                >
                  {PERFIS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
              {erro && <p className="text-sm" style={{ color: 'var(--accent-hover)' }}>{erro}</p>}
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
