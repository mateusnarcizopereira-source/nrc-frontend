// Data da última interação do lead (campo `ultimaInteracao`, já presente na listagem e no Kanban: nenhuma leitura extra).
// Registra a última ação HUMANA no CRM (mudança de estágio, comentário, nota, perfil, tarefa, visita, "Registrar contato").
// Ações do Sistema (esfriamento, repasse) não contam. Sem o campo, usa a data de criação.
export const LIMITE_RELATIVO_DIAS = 30; // até aqui "há N dias"; depois, a data completa

export function ultimaInteracaoDe(lead) {
  return lead?.ultimaInteracao || lead?.criadoEm || null;
}

const doisDigitos = (n) => String(n).padStart(2, '0');

// "dd/mm/aaaa hh:mm" (horário local do navegador)
export function dataCompleta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()} ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

// "agora", "há 5 min", "há 3 h", "ontem"/"há 1 dia", "há 12 dias" e, acima de 30 dias, "dd/mm/aaaa".
export function rotuloInteracao(iso, agora = Date.now()) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.floor((agora - t) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias > LIMITE_RELATIVO_DIAS) return dataCompleta(iso).slice(0, 10);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

// Texto para o card: "Última interação: há 3 dias" (ou vazio se não houver data).
export function textoInteracao(lead, agora = Date.now()) {
  const iso = ultimaInteracaoDe(lead);
  const r = rotuloInteracao(iso, agora);
  return r ? `Última interação: ${r}` : '';
}
