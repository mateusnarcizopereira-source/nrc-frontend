// Texto do badge de alerta ("Sem contato há 4h" / "Parado há 5 dias") —
// o campo `lead.alerta` já vem calculado do BACKEND (mesma config que
// dispara o push, nunca diverge do que realmente notifica o corretor;
// ver automacaoService.calcularAlerta). Aqui só formata pra exibição.
export function textoAlerta(alerta) {
  if (!alerta) return null;
  const diffMs = Date.now() - new Date(alerta.desde).getTime();
  const horas = Math.max(0, Math.floor(diffMs / 3600000));
  const dias = Math.floor(horas / 24);

  if (alerta.tipo === 'sem_contato') {
    return dias >= 1 ? `Sem contato há ${dias} dia${dias === 1 ? '' : 's'}` : `Sem contato há ${horas}h`;
  }
  return `Parado há ${dias} dia${dias === 1 ? '' : 's'}`;
}

// Cor do badge — "sem_contato" mais urgente (ninguém ligou ainda) que
// "parado" (já teve contato, só esfriou o acompanhamento).
export function corAlerta(alerta) {
  if (!alerta) return null;
  return alerta.tipo === 'sem_contato'
    ? { cor: 'var(--accent)', corRgb: 'var(--accent-rgb)', icone: 'phone-off' }
    : { cor: 'var(--warning)', corRgb: 'var(--warning-rgb)', icone: 'clock-exclamation' };
}
