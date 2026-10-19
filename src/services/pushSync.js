// Mantém o token de push deste aparelho sempre na conta logada (ver utils/pushToken.js para as regras).
// Nunca abre diálogo de permissão e nunca lança: push é um extra, não pode atrapalhar o app.
import api from './api';
import { obterTokenSemPerguntar } from './firebaseClient';
import { lerGuardado, gravarGuardado, limparGuardado, podePularVerificacao, precisaEnviar } from '../utils/pushToken';

// Login e abertura do app (e volta à aba): lê o token atual do FCM — cobre a renovação automática, porque o
// getToken devolve o token vigente — e só envia ao backend se mudou, se mudou a conta ou se passou 1 dia.
export async function sincronizarToken(usuario, { forcar = false } = {}) {
  try {
    if (!usuario?.id) return;
    const agora = Date.now();
    const guardado = lerGuardado(localStorage);
    if (podePularVerificacao({ guardado, usuarioId: usuario.id, agora, forcar })) return;
    const tokenAtual = await obterTokenSemPerguntar(); // null se não há permissão: nada a fazer
    if (!tokenAtual) return;
    if (!precisaEnviar({ tokenAtual, guardado, usuarioId: usuario.id, agora, forcar })) {
      gravarGuardado(localStorage, { token: tokenAtual, usuarioId: usuario.id, em: agora }); // só renova o "verificado em"
      return;
    }
    await api.post('/usuarios/me/fcm-token', { token: tokenAtual });
    gravarGuardado(localStorage, { token: tokenAtual, usuarioId: usuario.id, em: agora });
  } catch { /* silencioso */ }
}

// Ativação manual (tela Notificações / convite): envia e guarda, para o logout saber qual token remover.
export async function registrarTokenNoBackend(usuarioId, token) {
  await api.post('/usuarios/me/fcm-token', { token });
  if (usuarioId) gravarGuardado(localStorage, { token, usuarioId, em: Date.now() });
}

// Logout: tira o token deste aparelho da conta que está saindo. SÍNCRONO e sem espera: dispara o DELETE com o JWT
// que ainda está em mãos (keepalive sobrevive à navegação) e limpa o registro local; a UI nunca fica esperando.
export function removerTokenDoAparelho(jwt) {
  try {
    const guardado = lerGuardado(localStorage);
    limparGuardado(localStorage);
    if (!guardado?.token || !jwt) return;
    fetch(`${api.defaults.baseURL}/usuarios/me/fcm-token`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ token: guardado.token }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* silencioso */ }
}
