// Janela de check-in da fila do dia — espelha config/janelaFila.js do
// backend. Só pra exibição/UX aqui (desabilitar botão, mensagem clara);
// o backend SEMPRE revalida de verdade, nunca confia no relógio do
// navegador. Um lugar só no frontend, mesmo princípio do backend.
export function agoraBrasilia() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000);
}

export function dentroDaJanelaCheckin(data = agoraBrasilia()) {
  const h = data.getUTCHours();
  return h >= 9 && h < 10;
}

export function checkinAindaNaoAbriu(data = agoraBrasilia()) {
  return data.getUTCHours() < 9;
}

export function sorteioDevido(data = agoraBrasilia()) {
  return data.getUTCHours() >= 10;
}
