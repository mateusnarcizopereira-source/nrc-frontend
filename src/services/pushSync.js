// Mantém o token de push deste aparelho sempre na conta logada (ver utils/pushToken.js para as regras).
// Nunca abre diálogo de permissão e nunca lança: push é um extra, não pode atrapalhar o app.
import api from './api';
import { obterTokenSemPerguntar } from './firebaseClient';
import { lerGuardado, gravarGuardado, limparGuardado, podePularVerificacao, precisaEnviar, syncAtualizado, marcarSyncAtualizado, tokenAnteriorDe } from '../utils/pushToken';
import { descreverAparelho, idDoAparelho } from '../utils/aparelho';

// Quem é este aparelho, só para diagnóstico. Nunca sai pela API.
function dadosDoAparelho() {
  const instalado = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
  return { id: idDoAparelho(localStorage), ...descreverAparelho(navigator.userAgent, instalado) };
}

function enviarToken(token, usuarioId, guardado) {
  return api.post('/usuarios/me/fcm-token', {
    token,
    tokenAnterior: tokenAnteriorDe({ guardado, tokenAtual: token, usuarioId }),
    aparelho: dadosDoAparelho(),
  });
}

// Login e abertura do app (e volta à aba): lê o token atual do FCM — cobre a renovação automática, porque o
// getToken devolve o token vigente — e só envia ao backend se mudou, se mudou a conta ou se passou 1 dia.
export async function sincronizarToken(usuario, { forcar: forcarPedido = false } = {}) {
  try {
    if (!usuario?.id) return;
    const forcar = forcarPedido || !syncAtualizado(localStorage);
    const agora = Date.now();
    const guardado = lerGuardado(localStorage);
    if (podePularVerificacao({ guardado, usuarioId: usuario.id, agora, forcar })) return;
    const tokenAtual = await obterTokenSemPerguntar(); // null se não há permissão: nada a fazer
    if (!tokenAtual) return;
    if (!precisaEnviar({ tokenAtual, guardado, usuarioId: usuario.id, agora, forcar })) {
      gravarGuardado(localStorage, { token: tokenAtual, usuarioId: usuario.id, em: agora }); // só renova o "verificado em"
      return;
    }
    await enviarToken(tokenAtual, usuario.id, guardado);
    gravarGuardado(localStorage, { token: tokenAtual, usuarioId: usuario.id, em: agora });
    marcarSyncAtualizado(localStorage);
  } catch (e) {
    console.error('[Push] Falha ao sincronizar o token:', e?.message);
  }
}

// Ativação manual (tela Notificações / convite): envia e guarda, para o logout saber qual token remover.
export async function registrarTokenNoBackend(usuarioId, token) {
  await enviarToken(token, usuarioId, lerGuardado(localStorage));
  if (usuarioId) gravarGuardado(localStorage, { token, usuarioId, em: Date.now() });
  marcarSyncAtualizado(localStorage);
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
    }).catch((e) => console.error('[Push] Falha ao retirar o token no logout:', e?.message));
  } catch (e) {
    console.error('[Push] Falha ao retirar o token no logout:', e?.message);
  }
}
