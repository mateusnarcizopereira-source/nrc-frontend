import { useEffect, useState } from 'react';
import api from '../services/api';

// "Aguardando atendimento" só aparece na tela (coluna do Kanban, filtro,
// item do funil, "Perdidos hoje") quando a regra está EM VIGOR no backend
// (configuracoes/atendimento: ativo E agora >= ativaEm). Antes disso a tela é
// exatamente a de sempre. O valor vem de GET /config/atendimento e é guardado
// por 5 minutos — quando a regra entra em vigor à meia-noite, a tela passa a
// mostrar sem precisar de deploy. Em qualquer erro: false (tela como sempre foi).
const TTL_MS = 5 * 60 * 1000;
let cache = { valor: false, em: 0, pendente: null };

function carregar() {
  if (cache.pendente) return cache.pendente;
  cache.pendente = api.get('/config/atendimento')
    .then((r) => r.data?.vigente === true)
    .catch(() => false)
    .then((valor) => {
      cache = { valor, em: Date.now(), pendente: null };
      return valor;
    });
  return cache.pendente;
}

export function useAtendimentoVigente() {
  const [vigente, setVigente] = useState(cache.valor);

  useEffect(() => {
    let vivo = true;
    if (Date.now() - cache.em < TTL_MS) {
      setVigente(cache.valor);
      return undefined;
    }
    carregar().then((v) => { if (vivo) setVigente(v); });
    return () => { vivo = false; };
  }, []);

  return vigente;
}
