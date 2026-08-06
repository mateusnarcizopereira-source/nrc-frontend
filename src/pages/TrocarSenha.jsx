import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import logoNRC from '../assets/logo-nrc.svg';

// Tela bloqueante de troca obrigatória de senha no primeiro acesso.
export default function TrocarSenha() {
  const { usuario, logout, confirmarTrocaSenha } = useAuth();
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (form.novaSenha.length < 6) { setErro('A nova senha deve ter ao menos 6 caracteres.'); return; }
    if (form.novaSenha !== form.confirmar) { setErro('A confirmação não confere.'); return; }
    if (form.novaSenha === form.senhaAtual) { setErro('A nova senha deve ser diferente da atual.'); return; }
    setSalvando(true);
    try {
      await api.post('/auth/trocar-senha', { senhaAtual: form.senhaAtual, novaSenha: form.novaSenha });
      confirmarTrocaSenha();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Não foi possível trocar a senha.');
      setSalvando(false);
    }
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(192,57,43,0.07) 0%, #08080A 60%)' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={logoNRC} alt="NRC" className="h-28" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-lg font-bold" style={{ color: '#F4F4F8' }}>Defina uma nova senha</h1>
          <p className="text-sm mt-1" style={{ color: '#6A6A70' }}>
            Primeiro acesso de <span style={{ color: '#C0392B' }}>{usuario?.nome}</span>. Troque a senha provisória para continuar.
          </p>
        </div>

        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#3A3A42' }}>Senha atual</label>
            <input type="password" className="input" placeholder="Senha provisória" value={form.senhaAtual}
              onChange={(e) => set('senhaAtual', e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#3A3A42' }}>Nova senha</label>
            <input type="password" className="input" placeholder="Mínimo 6 caracteres" value={form.novaSenha}
              onChange={(e) => set('novaSenha', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#3A3A42' }}>Confirmar nova senha</label>
            <input type="password" className="input" placeholder="Repita a nova senha" value={form.confirmar}
              onChange={(e) => set('confirmar', e.target.value)} required />
          </div>

          {erro && (
            <div className="text-sm px-4 py-3" style={{ background: 'rgba(192,57,43,0.10)', border: '1px solid rgba(192,57,43,0.28)', borderRadius: '2px', color: '#E74C3C' }}>
              {erro}
            </div>
          )}

          <button type="submit" className="btn-primary w-full mt-2" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        <button onClick={logout} className="w-full text-center mt-6 text-xs" style={{ color: '#3A3A42' }}>
          Sair
        </button>
      </div>
    </div>
  );
}
