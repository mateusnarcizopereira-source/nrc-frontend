// ══════════════════════════════════════════════════════════════
// FCM (Tarefa 3) — push de lead novo, mensagens em background/app
// fechado. Integrado aqui (não um segundo service worker) pra não
// competir pelo mesmo escopo com o cache offline abaixo.
//
// Config PÚBLICA do Firebase (não secreta) — só funciona depois de
// preenchida com os mesmos valores das env vars VITE_FIREBASE_* do
// app principal (um service worker não lê env vars do Vite, por ser
// um arquivo estático). Enquanto os placeholders continuarem aqui,
// este bloco não faz nada — o resto do service worker (cache/offline)
// segue funcionando normalmente, é só o push que fica inativo.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

  const FIREBASE_CONFIG_PUSH = {
    apiKey: 'AIzaSyB_zobn9OQRdYV5oBcoOiq5pjrehvpEgxU',
    authDomain: 'crm-meta-eq-bia.firebaseapp.com',
    projectId: 'crm-meta-eq-bia',
    storageBucket: 'crm-meta-eq-bia.firebasestorage.app',
    messagingSenderId: '304302136741',
    appId: '1:304302136741:web:17c4fd7b3c39ff2aef1c4c',
  };

  if (!FIREBASE_CONFIG_PUSH.apiKey.startsWith('COLE_AQUI')) {
    firebase.initializeApp(FIREBASE_CONFIG_PUSH);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const titulo = payload.notification?.title || 'NRC';
      const corpo = payload.notification?.body || '';
      self.registration.showNotification(titulo, {
        body: corpo,
        icon: '/favicon.svg',
        data: payload.data || {},
      });
    });
  }
} catch (e) {
  console.error('[SW] FCM não inicializado (não afeta o cache offline):', e);
}

// Clique na notificação (Tarefa 3) — abre direto a página do lead.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ('focus' in c) { c.postMessage({ tipo: 'navegar', link }); return c.focus(); }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});

const CACHE = 'nrc-v1';
const ESTATICOS = ['/', '/index.html', '/favicon.svg', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESTATICOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Deixa requisições de API sempre ir para a rede
  if (url.pathname.startsWith('/api/')) return;

  // Para assets do Vite (hashed), cache-first
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Para tudo mais: network-first, fallback para cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request).then((c) => c || caches.match('/index.html')))
  );
});
