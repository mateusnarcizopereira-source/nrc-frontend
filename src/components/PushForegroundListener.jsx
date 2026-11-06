import { useEffect } from 'react';
import { ouvirMensagensEmForeground } from '../services/firebaseClient';
import { mostrarAvisoDoSistema } from '../services/avisoDoSistema';

// Push de lead novo (ou de teste) chegando com o app ABERTO — sem isso,
// simplesmente sumia (bug reportado 06/09: "ativei, status verde, mas o
// teste não chega"). O motivo: o Firebase só mostra a notificação do
// sistema sozinho quando a aba está em SEGUNDO PLANO/fechada (aí quem
// mostra é o service worker, public/sw.js, via onBackgroundMessage). Com
// a aba em primeiro plano — exatamente o caso de alguém olhando a tela
// "Notificações" e apertando "Enviar notificação de teste" — o SDK não
// mostra nada por conta própria; a entrega vai só pra este listener.
//
// Sem duplicar: o roteamento foreground-vs-background é feito PELO
// PRÓPRIO SDK do Firebase dentro do service worker (ele decide, pra cada
// envio, se entrega aqui OU deixa o service worker mostrar — nunca os
// dois pro mesmo envio) — este componente só cobre o lado que faltava,
// não compete com o sw.js.
//
// Montado uma vez só, globalmente (App.jsx) — não depende de perfil, já
// que a notificação de teste está liberada pra todos.
export default function PushForegroundListener() {
  useEffect(() => {
    const unsubscribe = ouvirMensagensEmForeground((payload) => {
      mostrarAvisoDoSistema(payload.notification?.title || 'NRC', {
        corpo: payload.notification?.body || '',
        link: payload.data?.link || '/',
        tag: payload.data?.tag,
        tipo: 'primeiro_plano',
      });
    });

    return () => unsubscribe();
  }, []);

  return null;
}
