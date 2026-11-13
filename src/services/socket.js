import { io } from 'socket.io-client';
import api from './api';

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
const TEMPO_NOVA_TENTATIVA_MS = 15000;

// O servidor derrubou ou recusou a conexão: se o login venceu, a API responde 401 e leva para a tela de login. Sem isso, a tela
// ficaria aberta parecendo normal, sem receber mais nada em tempo real.
function conferirLogin() {
  api.get('/auth/me').catch(() => {});
}

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
    // O servidor só aceita conexão com login, e decide sozinho as salas. Função, não valor: lê o token a cada tentativa.
    auth: (cb) => cb({ token: localStorage.getItem('nrc_token') }),
  });

  // Transição: o backend anterior ainda precisa deste aviso para entrar na sala; o novo ignora. Sai depois da publicação.
  socket.on('connect', () => {
    console.log('[Socket] Conectado', socket.id);
    if (usuarioIdAtual) socket.emit('join_room', usuarioIdAtual);
  });
  // Quando o servidor recusa a conexão, o Socket.io não tenta de novo sozinho. Login inválido fica assim (a API leva para a
  // tela de login); falha passageira do servidor tenta de novo.
  socket.on('connect_error', (erro) => {
    console.log('[Socket] Não conectou:', erro.message);
    if (erro.message === 'nao_autorizado') { conferirLogin(); return; }
    if (socket.active) return;
    setTimeout(() => { if (socket && !socket.connected) socket.connect(); }, TEMPO_NOVA_TENTATIVA_MS);
  });
  socket.on('disconnect', (motivo) => {
    console.log('[Socket] Desconectado:', motivo);
    if (motivo === 'io server disconnect') conferirLogin();
  });
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
