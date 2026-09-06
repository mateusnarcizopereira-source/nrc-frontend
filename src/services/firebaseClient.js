// Firebase Cloud Messaging (Tarefa 3) — push de lead novo. Config PÚBLICA
// do app web do Firebase (não é secreta — protegida por regras do
// Firestore/Auth, não por sigilo; mesmo princípio de qualquer config
// client-side do Firebase). Vem de env vars pra não hardcodar no bundle —
// ver README/relatório pra quais variáveis cadastrar no Netlify.
//
// Se as env vars não estiverem configuradas ainda, tudo aqui falha
// graciosamente (retorna null) — o resto do app nunca quebra por causa
// disso, só o recurso de push fica indisponível.
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function configCompleta() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId);
}

let appPromise = null;
function getFirebaseApp() {
  if (!configCompleta()) return null;
  if (!appPromise) {
    appPromise = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return appPromise;
}

// Pede permissão do navegador (se ainda não decidida) e, se concedida,
// obtém o token FCM deste dispositivo. Retorna null em qualquer caso que
// não resulte num token utilizável — quem chama decide o que fazer.
export async function pedirPermissaoEObterToken() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!('Notification' in window)) return null;
  if (!(await isSupported().catch(() => false))) return null;
  if (!VAPID_KEY) return null;

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') return null;

  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    return token || null;
  } catch (e) {
    console.error('[Push] Falha ao obter token FCM:', e.message);
    return null;
  }
}

// Notificação chegando com o app ABERTO (foreground) — o SDK não mostra a
// notificação do sistema sozinho nesse caso (só em background, via o
// service worker). O sino de notificações in-app já cobre isso em tempo
// real via socket.io; aqui só evita warning do SDK por falta de listener.
export function ouvirMensagensEmForeground(callback) {
  const app = getFirebaseApp();
  if (!app) return () => {};
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, callback);
  } catch {
    return () => {};
  }
}

export { configCompleta as pushConfigurado };
