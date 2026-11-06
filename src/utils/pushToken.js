// Regras puras (testáveis sem navegador) da sincronização do token de push com o backend.
// O token FCM do aparelho precisa estar SEMPRE na conta logada: reenviado no login e ao abrir o app (só quando mudou ou
// há mais de 24 h), e removido no logout. Estas funções só decidem; quem fala com a rede é services/pushSync.js.
export const CHAVE_TOKEN = 'nrc_fcm_token';        // último token enviado deste aparelho
export const CHAVE_USUARIO = 'nrc_fcm_usuario';    // a quem ele foi enviado
export const CHAVE_EM = 'nrc_fcm_sync_em';         // quando (ms)
export const CHAVE_VERSAO = 'nrc_fcm_sync_versao'; // versão do que é enviado ao backend
export const VERSAO_SYNC = '2';                    // 2: inclui os dados do aparelho
export const INTERVALO_VERIFICAR_MS = 12 * 3600e3; // não consulta o FCM de novo antes disso (mesmo usuário)
export const INTERVALO_REENVIAR_MS = 24 * 3600e3;  // reenvia mesmo sem mudança, no máximo 1x por dia

export function lerGuardado(storage) {
  try {
    const token = storage.getItem(CHAVE_TOKEN);
    if (!token) return null;
    return { token, usuarioId: storage.getItem(CHAVE_USUARIO), em: Number(storage.getItem(CHAVE_EM)) || 0 };
  } catch { return null; }
}

export function gravarGuardado(storage, { token, usuarioId, em }) {
  try { storage.setItem(CHAVE_TOKEN, token); storage.setItem(CHAVE_USUARIO, String(usuarioId)); storage.setItem(CHAVE_EM, String(em)); } catch { /* sem storage: sem otimização */ }
}

export function limparGuardado(storage) {
  try { storage.removeItem(CHAVE_TOKEN); storage.removeItem(CHAVE_USUARIO); storage.removeItem(CHAVE_EM); } catch { /* ignora */ }
}

// Este aparelho já enviou o token no formato atual? Se não, envia na próxima abertura, sem esperar o intervalo.
export function syncAtualizado(storage) {
  try { return storage.getItem(CHAVE_VERSAO) === VERSAO_SYNC; } catch { return true; }
}

export function marcarSyncAtualizado(storage) {
  try { storage.setItem(CHAVE_VERSAO, VERSAO_SYNC); } catch { /* sem armazenamento: tenta de novo na próxima abertura */ }
}

// Token que este aparelho usava antes, para o backend retirar: só se era da mesma conta (outra conta cuida do dela).
export function tokenAnteriorDe({ guardado, tokenAtual, usuarioId }) {
  if (!guardado?.token || guardado.token === tokenAtual) return null;
  return String(guardado.usuarioId) === String(usuarioId) ? guardado.token : null;
}

// Vale a pena nem consultar o FCM? (mesmo usuário, verificado há pouco)
export function podePularVerificacao({ guardado, usuarioId, agora, forcar = false }) {
  if (forcar || !guardado) return false;
  return String(guardado.usuarioId) === String(usuarioId) && agora - guardado.em < INTERVALO_VERIFICAR_MS;
}

// Com o token atual em mãos: precisa mandar ao backend?
export function precisaEnviar({ tokenAtual, guardado, usuarioId, agora, forcar = false }) {
  if (!tokenAtual) return false;
  if (forcar || !guardado) return true;
  if (guardado.token !== tokenAtual) return true;                      // o FCM renovou o token
  if (String(guardado.usuarioId) !== String(usuarioId)) return true;   // outra conta neste aparelho
  return agora - guardado.em >= INTERVALO_REENVIAR_MS;                 // confirmação diária (idempotente no backend)
}
