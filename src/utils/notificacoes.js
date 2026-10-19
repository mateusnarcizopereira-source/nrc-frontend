// Regras puras do sino: separar o aviso de LEAD (lead novo / lead repassado) das demais notificações e manter os
// contadores. O número vermelho do sino conta só os leads; o total fica como contador secundário.
export const TIPOS_LEAD = ['lead_novo', 'lead_repassado'];

export const ehLead = (tipo) => TIPOS_LEAD.includes(tipo);

// grupo: 'leads' | 'outras'
export function filtrarPorGrupo(lista, grupo) {
  return (lista || []).filter((n) => (grupo === 'leads') === ehLead(n.tipo));
}

// Contadores {naoLidas, naoLidasLeads} a partir de uma lista (usado como reserva se o servidor não responder).
export function contarDaLista(lista) {
  const naoLidas = (lista || []).filter((n) => !n.lida);
  return { naoLidas: naoLidas.length, naoLidasLeads: naoLidas.filter((n) => ehLead(n.tipo)).length };
}

// Uma notificação nova (tempo real) chegou.
export function contadoresAposNova(c, notif) {
  return { naoLidas: c.naoLidas + 1, naoLidasLeads: c.naoLidasLeads + (ehLead(notif.tipo) ? 1 : 0) };
}

// Uma notificação foi marcada como lida (só desconta se ela estava não lida).
export function contadoresAposLida(c, notif) {
  if (!notif || notif.lida) return c;
  return { naoLidas: Math.max(0, c.naoLidas - 1), naoLidasLeads: Math.max(0, c.naoLidasLeads - (ehLead(notif.tipo) ? 1 : 0)) };
}

export const CONTADORES_ZERO = { naoLidas: 0, naoLidasLeads: 0 };
