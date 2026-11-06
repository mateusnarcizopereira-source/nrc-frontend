// Mostra um aviso do sistema com o app aberto. Tem de ser pelo service worker: no Chrome do Android e no iOS, new Notification()
// não existe de fato e dá erro. Sem service worker (navegador antigo), tenta o caminho direto.
// Nunca lança, e toda falha fica registrada: é o tipo de erro que acontece no celular, onde ninguém vê o console.
import api from './api';

const ESPERA_SW_MS = 5000;

export function registrarFalhaDeAviso(etapa, erro, tipo) {
  const mensagem = String(erro?.message || erro || 'desconhecido');
  console.error(`[Push] Falha em ${etapa}:`, mensagem);
  api.post('/push/falha-exibicao', { etapa, mensagem, tipo }).catch((e) => console.error('[Push] Falha ao registrar a falha:', e?.message));
}

export async function mostrarAvisoDoSistema(titulo, { corpo = '', link = '/', tag, tipo } = {}) {
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  const opcoes = { body: corpo, icon: '/favicon.svg', data: { link }, ...(tag ? { tag } : {}) };
  try {
    if (!('serviceWorker' in navigator)) throw new Error('sem service worker');
    const registro = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error('service worker indisponível')), ESPERA_SW_MS)),
    ]);
    await registro.showNotification(titulo, opcoes);
    return true;
  } catch (erroSw) {
    try {
      const aviso = new Notification(titulo, opcoes);
      aviso.onclick = () => { window.focus(); window.location.assign(link); aviso.close(); };
      return true;
    } catch (erroDireto) {
      registrarFalhaDeAviso('mostrar-aviso', `${erroSw?.message} / ${erroDireto?.message}`, tipo);
      return false;
    }
  }
}
