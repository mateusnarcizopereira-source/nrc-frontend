// Estágios que contam como "Meeting / Visita" nas métricas do Dashboard (card da equipe e "Em negociação"
// do modo solo). Call Agendada e Call Realizado entram no MESMO grupo de Meeting Agendado e Visita Agendada:
// o CRM não tem um estágio "visita realizada" separado, então a métrica de visita é um único grupo.
export const ESTAGIOS_VISITA = ['meeting_agendado', 'call_agendada', 'call_realizado', 'visita_agendada'];

export function contaComoVisita(status) {
  return ESTAGIOS_VISITA.includes(status);
}
