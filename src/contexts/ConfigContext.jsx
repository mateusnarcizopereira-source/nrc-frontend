import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ConfigContext = createContext({ modoSolo: false, configCarregada: false });

export function ConfigProvider({ children }) {
  const { usuario } = useAuth();
  const [modoSolo, setModoSoloState] = useState(false);
  const [configCarregada, setConfigCarregada] = useState(false);

  const recarregar = useCallback(async () => {
    if (!usuario) { setConfigCarregada(true); return; }
    try {
      const r = await api.get('/config/geral');
      setModoSoloState(r.data.modoSolo || false);
    } catch {}
    setConfigCarregada(true);
  }, [usuario]);

  useEffect(() => { recarregar(); }, [recarregar]);

  async function setModoSolo(valor) {
    await api.put('/config/geral', { modoSolo: valor });
    setModoSoloState(valor);
  }

  return (
    <ConfigContext.Provider value={{ modoSolo, setModoSolo, configCarregada }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
