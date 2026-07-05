import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

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

  async function login(email, senha) {
    const res = await api.post('/auth/login', { email, senha });
    localStorage.setItem('nrc_token', res.data.token);
    setUsuario(res.data.usuario);
    return res.data.usuario;
  }

  function logout() {
    localStorage.removeItem('nrc_token');
    setUsuario(null);
  }

  const temPerfil = (perfilMinimo) => {
    const hierarquia = ['corretor', 'operador', 'gerente', 'diretor', 'editor'];
    return hierarquia.indexOf(usuario?.perfil) >= hierarquia.indexOf(perfilMinimo);
  };

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, temPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
