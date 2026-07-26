import { io } from 'socket.io-client';

// Deriva a ORIGEM do backend a partir do VITE_API_URL, tirando o sufixo "/api".
// Ex.: https://nrc-backend-e9en.onrender.com/api  ->  https://nrc-backend-e9en.onrender.com
// Em dev (VITE_API_URL ausente), cai na origem da própria página (proxy do Vite).
function backendOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    return new URL(apiUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

let socket = null;
let usuarioIdAtual = null;

export function conectarSocket(usuarioId) {
  if (usuarioId != null) usuarioIdAtual = String(usuarioId);

  if (socket) {
    if (!socket.connected) socket.connect();
    // se já está conectado, garante que está na room certa
    else if (usuarioIdAtual) socket.emit('join_room', usuarioIdAtual);
    return socket;
  }

  socket = io(backendOrigin(), {
    transports: ['websocket', 'polling'], // websocket primeiro; polling como rede de segurança
    reconnection: true,                   // Render free dorme: precisa voltar sozinho
    reconnectionAttempts: Infinity,       // nunca desistir enquanto o backend não acorda
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,          // tenta ~a cada 10s até reconectar
    timeout: 20000,
  });

  // (Re)entra na room do usuário a CADA conexão — inclusive depois de uma reconexão,
  // porque o Socket.io recria o socket e as rooms se perdem ao reconectar.
  socket.on('connect', () => {
    console.log('[Socket] Conectado', socket.id);
    if (usuarioIdAtual) socket.emit('join_room', usuarioIdAtual);
  });
  socket.on('disconnect', (motivo) => console.log('[Socket] Desconectado:', motivo));
  socket.io.on('reconnect', (n) => console.log('[Socket] Reconectado após', n, 'tentativa(s)'));

  return socket;
}

export function desconectarSocket() {
  if (socket) { socket.disconnect(); socket = null; }
  usuarioIdAtual = null;
}

export function getSocket() {
  return socket;
}
