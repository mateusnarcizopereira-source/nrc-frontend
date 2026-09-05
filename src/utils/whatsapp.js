// Monta o número no formato que o wa.me espera (DDI + DDD + número, só dígitos).
// Leads importados via webhook da Meta já chegam com o telefone gravado como
// "+55..." (metaWebhookController.js, backend) — os dígitos já vêm com "55".
// Leads cadastrados manualmente podem vir sem DDI. Sem essa checagem, prependar
// "55" sempre duplicava o DDI dos leads da Meta e quebrava o link do WhatsApp.
export function numeroWhatsapp(telefoneBruto) {
  const digitos = (telefoneBruto || '').replace(/\D/g, '');
  if (!digitos) return '';
  // BR: 55 + DDD(2) + número(8 ou 9) = 12 ou 13 dígitos já com DDI.
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}
