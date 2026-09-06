import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Registra o Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });

  // Clique numa notificação push (Tarefa 3) — o SW não navega sozinho
  // (client.postMessage não muda a URL), então escuta aqui e navega.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.tipo === 'navegar' && event.data.link) {
      window.location.assign(event.data.link);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
