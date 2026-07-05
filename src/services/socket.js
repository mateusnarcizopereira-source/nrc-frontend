import { io } from 'socket.io-client';

let socket = null;

export function conectarSocket() {
  if (socket?.connected) return socket;

  socket = io('/', { autoConnect: true, transports: ['websocket'] });

  socket.on('connect', () => console.log('[Socket] Conectado'));
  socket.on('disconnect', () => console.log('[Socket] Desconectado'));

  return socket;
}

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
