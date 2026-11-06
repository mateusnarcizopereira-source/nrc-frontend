import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Registra o Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('[Push] Falha ao registrar o service worker:', e?.message));
  });

  // Clique numa notificação push (Tarefa 3) — o SW não navega sozinho
  // (client.postMessage não muda a URL), então escuta aqui e navega.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.tipo === 'navegar' && event.data.link) {
      window.location.assign(event.data.link);
    }
    // Clique no aviso mostrado pelo SDK do Firebase: com o app já aberto, ele só dá foco e avisa aqui; quem navega é o app.
    if (event.data?.isFirebaseMessaging && event.data.messageType === 'notification-clicked') {
      const link = event.data.fcmOptions?.link || event.data.data?.link;
      if (link) window.location.assign(link);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
