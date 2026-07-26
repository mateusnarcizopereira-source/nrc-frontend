import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { conectarSocket } from '../services/socket';

const Ctx = createContext(null);

const TIPOS_COM_SOM = new Set(['lead_novo', 'sorteio']); // só estes tocam som
const SOM_KEY = 'nrc_som_notif';

// Som curto e discreto sintetizado (evita depender de arquivo binário).
let audioCtx = null;
function tocarSom() {
  try {
    if (!audioCtx) return; // só toca depois de destravado por um gesto
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    const nota = (freq, inicio, dur) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t0 + inicio);
      gain.gain.linearRampToValueAtTime(0.12, t0 + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + inicio + dur);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t0 + inicio); osc.stop(t0 + inicio + dur);
    };
    nota(660, 0, 0.14);
    nota(880, 0.11, 0.16);
  } catch { /* política de autoplay / sem áudio: ignora */ }
}

export function NotificacoesProvider({ children }) {
  const { usuario } = useAuth();
  const [lista, setLista] = useState([]);
  const [somLigado, setSomLigadoState] = useState(() => localStorage.getItem(SOM_KEY) !== '0');
  const somRef = useRef(somLigado);
  somRef.current = somLigado;

  const naoLidas = useMemo(() => lista.filter((n) => !n.lida).length, [lista]);

  const carregar = useCallback(() => {
    if (!usuario) return;
    api.get('/notificacoes').then((r) => setLista(r.data)).catch(() => {});
  }, [usuario]);

  useEffect(() => { carregar(); }, [carregar]);

  // Listener único de tempo real (via room do usuário — Fase 0.5).
  useEffect(() => {
    if (!usuario) return;
    const socket = conectarSocket(usuario.id);
    const onNova = (notif) => {
      setLista((prev) => [notif, ...prev].slice(0, 50));
      if (somRef.current && TIPOS_COM_SOM.has(notif.tipo)) tocarSom();
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification(notif.titulo || 'NRC', { body: notif.mensagem || '' }); } catch {}
      }
    };
    socket?.on('notificacao_nova', onNova);
    return () => socket?.off('notificacao_nova', onNova);
  }, [usuario]);

  // Destrava o áudio e pede permissão de notificação no primeiro gesto do usuário.
  useEffect(() => {
    const prime = () => {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
      } catch {}
      if ('Notification' in window && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch {}
      }
      window.removeEventListener('pointerdown', prime);
    };
    window.addEventListener('pointerdown', prime);
    return () => window.removeEventListener('pointerdown', prime);
  }, []);

  function setSomLigado(v) {
    localStorage.setItem(SOM_KEY, v ? '1' : '0');
    setSomLigadoState(v);
  }

  async function marcarLida(id) {
    setLista((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    try { await api.patch(`/notificacoes/${id}/lida`); } catch {}
  }

  async function marcarTodas() {
    setLista((prev) => prev.map((n) => ({ ...n, lida: true })));
    try { await api.post('/notificacoes/marcar-todas'); } catch {}
  }

  return (
    <Ctx.Provider value={{ lista, naoLidas, somLigado, setSomLigado, marcarLida, marcarTodas }}>
      {children}
    </Ctx.Provider>
  );
}

export const useNotificacoes = () => useContext(Ctx) || {
  lista: [], naoLidas: 0, somLigado: true, setSomLigado: () => {}, marcarLida: () => {}, marcarTodas: () => {},
};
