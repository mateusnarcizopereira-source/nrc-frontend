import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoNRC from '../assets/logo-nrc.svg';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [avisandoSpinDown, setAvisandoSpinDown] = useState(false);
  const spinDownTimer = useRef(null);

  useEffect(() => () => clearTimeout(spinDownTimer.current), []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    setAvisandoSpinDown(false);
    spinDownTimer.current = setTimeout(() => setAvisandoSpinDown(true), 5000);
    try {
      await login(form.email, form.senha);
      navigate('/');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao fazer login. Tente novamente.');
    } finally {
      clearTimeout(spinDownTimer.current);
      setCarregando(false);
      setAvisandoSpinDown(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(var(--accent-rgb), 0.07) 0%, var(--bg) 60%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src={logoNRC} alt="NRC" className="h-40" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="space-y-4 pt-8"
            style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.07)' }}
          >
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                E-mail
              </label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Senha
              </label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                required
              />
            </div>
          </div>

          {erro && (
            <div
              className="text-sm px-4 py-3"
              style={{
                background: 'rgba(var(--accent-rgb), 0.10)',
                border: '1px solid rgba(var(--accent-rgb), 0.28)',
                borderRadius: '2px',
                color: 'var(--accent-hover)',
              }}
            >
              {erro}
            </div>
          )}

          {avisandoSpinDown && (
            <div
              className="text-sm px-4 py-3"
              style={{
                background: 'rgba(var(--amber-rgb), 0.08)',
                border: '1px solid rgba(var(--amber-rgb), 0.22)',
                borderRadius: '2px',
                color: 'var(--amber)',
              }}
            >
              <p className="font-semibold">Conectando ao servidor...</p>
              <p className="mt-0.5" style={{ color: 'var(--amber)' }}>
                O servidor pode demorar até 1 minuto para responder na primeira vez do dia. Aguarde.
              </p>
            </div>
          )}

          <button type="submit" className="btn-primary w-full mt-2" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-10 text-[11px] tracking-widest uppercase" style={{ color: 'var(--text-faint)' }}>
          NRC v1.0 — Acesso restrito
        </p>
      </div>
    </div>
  );
}
