import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { conectarSocket } from '../services/socket';
import { contarDaLista, contadoresAposNova, contadoresAposLida, CONTADORES_ZERO } from '../utils/notificacoes';

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

  // Contadores vêm do servidor (contagem barata, valem para TODAS as notificações, não só as 50 da lista) e são
  // ajustados na hora quando algo chega ou é lido. O número do sino conta só os LEADS.
  const [contadores, setContadores] = useState(CONTADORES_ZERO);
  const naoLidas = contadores.naoLidasLeads;
  const naoLidasTotal = contadores.naoLidas;
  const naoLidasOutras = Math.max(0, contadores.naoLidas - contadores.naoLidasLeads);

  const carregar = useCallback(() => {
    if (!usuario) return;
    api.get('/notificacoes').then((r) => {
      setLista(r.data);
      setContadores((c) => (c === CONTADORES_ZERO ? contarDaLista(r.data) : c)); // reserva até o servidor responder
    }).catch(() => {});
    api.get('/notificacoes/contador').then((r) => setContadores({ naoLidas: r.data.naoLidas || 0, naoLidasLeads: r.data.naoLidasLeads || 0 })).catch(() => {});
  }, [usuario]);

  useEffect(() => { carregar(); }, [carregar]);

  // Listener único de tempo real (via room do usuário — Fase 0.5).
  useEffect(() => {
    if (!usuario) return;
    const socket = conectarSocket(usuario.id);
    const onNova = (notif) => {
      setLista((prev) => [notif, ...prev].slice(0, 50));
      setContadores((c) => contadoresAposNova(c, notif));
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
    setContadores((c) => contadoresAposLida(c, lista.find((n) => n.id === id)));
    setLista((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    try { await api.patch(`/notificacoes/${id}/lida`); } catch {}
  }

  async function marcarTodas() {
    setContadores(CONTADORES_ZERO);
    setLista((prev) => prev.map((n) => ({ ...n, lida: true })));
    try { await api.post('/notificacoes/marcar-todas'); } catch {}
  }

  return (
    <Ctx.Provider value={{ lista, naoLidas, naoLidasTotal, naoLidasOutras, somLigado, setSomLigado, marcarLida, marcarTodas }}>
      {children}
    </Ctx.Provider>
  );
}

export const useNotificacoes = () => useContext(Ctx) || {
  lista: [], naoLidas: 0, naoLidasTotal: 0, naoLidasOutras: 0, somLigado: true, setSomLigado: () => {}, marcarLida: () => {}, marcarTodas: () => {},
};
