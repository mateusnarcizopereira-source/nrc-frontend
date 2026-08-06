import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { conectarSocket, desconectarSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nrc_token');
    if (!token) { setCarregando(false); return; }

    api.get('/auth/me')
      .then((res) => setUsuario(res.data))
      .catch(() => localStorage.removeItem('nrc_token'))
      .finally(() => setCarregando(false));
  }, []);

  // Conecta o socket e entra na room do usuário assim que soubermos quem ele é.
  // Centralizado aqui para que a room seja (re)ativada em qualquer tela.
  useEffect(() => {
    if (usuario?.id) conectarSocket(usuario.id);
  }, [usuario?.id]);

  async function login(email, senha) {
    const res = await api.post('/auth/login', { email, senha });
    localStorage.setItem('nrc_token', res.data.token);
    setUsuario(res.data.usuario);
    return res.data.usuario;
  }

  function logout() {
    desconectarSocket();
    localStorage.removeItem('nrc_token');
    setUsuario(null);
  }

  const temPerfil = (perfilMinimo) => {
    const hierarquia = ['corretor', 'operador', 'gerente', 'diretor', 'editor'];
    return hierarquia.indexOf(usuario?.perfil) >= hierarquia.indexOf(perfilMinimo);
  };

  // Após a troca obrigatória de senha, limpa a flag localmente (sem novo login).
  function confirmarTrocaSenha() {
    setUsuario((u) => (u ? { ...u, precisaTrocarSenha: false } : u));
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, temPerfil, confirmarTrocaSenha }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
