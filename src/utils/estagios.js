// Estágios que contam como "Meeting / Visita" nas métricas do Dashboard (card da equipe e "Em negociação" do modo solo).
// A contagem é pelo ESTÁGIO ATUAL do lead (um lead conta uma vez, no estágio em que está): quem avança de Visita Realizada
// para Retorno sai de um e entra no outro, nunca conta duas vezes. Call Agendada/Realizado e Visita Realizada/Retorno entram no
// mesmo grupo de Meeting e Visita Agendada. "Visita Não Realizada" NÃO conta: a visita foi marcada mas não aconteceu.
export const ESTAGIOS_VISITA = ['meeting_agendado', 'call_agendada', 'call_realizado', 'visita_agendada', 'visita_realizada', 'retorno'];

export function contaComoVisita(status) {
  return ESTAGIOS_VISITA.includes(status);
}
