// Texto do "Copiar relatório" do Radar do dia. Só a linha Leads é preenchida; as demais ficam 00 para completar à mão.
// "Sem empreendimento" aparece só na tela — nunca entra no texto. Janela e contagem vêm prontas do backend.
export const SEM_EMPREENDIMENTO = 'Sem empreendimento';
const TRACOS = '——————————';

const dois = (n) => String(n).padStart(2, '0');

// '2026-10-22' → '22.10.2026'
export function dataComPontos(iso) {
  const [a, m, d] = String(iso || '').split('-');
  return a && m && d ? `${d}.${m}.${a}` : '';
}

export function construtorasDoRelatorio(porConstrutora) {
  return (porConstrutora || []).filter((c) => c.construtora !== SEM_EMPREENDIMENTO && c.leads > 0);
}

export function montarRelatorio(dataIso, porConstrutora) {
  const linhas = ['Radar On Empyrus', '', `Data:     ${dataComPontos(dataIso)}`, ''];
  for (const c of construtorasDoRelatorio(porConstrutora)) {
    linhas.push(
      `*${c.construtora}*`, '',
      `Leads:                  ${dois(c.leads)}`,
      'Agendamentos:  00',
      'Visitas:                 00',
      'Propostas:           00',
      'Vendas:                00',
      '', TRACOS, '',
    );
  }
  return linhas.join('\n').replace(/\n+$/, '\n');
}
