// Texto do "Copiar relatório" do Radar do dia. Só a linha Leads é preenchida; as demais ficam 00 para completar à mão.
// "Sem empreendimento" aparece só na tela — nunca entra no texto. A contagem (período 22:01 → 22:00 de Brasília) vem pronta do backend.
export const SEM_EMPREENDIMENTO = 'Sem empreendimento';
const TRACOS = '——————————';

const dois = (n) => String(n).padStart(2, '0');

// '2026-10-22' → '22.10.2026'
export function dataComPontos(iso) {
  const [a, m, d] = String(iso || '').split('-');
  return a && m && d ? `${d}.${m}.${a}` : '';
}

// { de: '2026-10-21T22:01', ate: '2026-10-22T22:00' } → '21/10 22:01 → 22/10 22:00'
const curto = (t) => { const [d, h] = String(t || '').split('T'); const [, m, dia] = (d || '').split('-'); return dia && h ? `${dia}/${m} ${h}` : ''; };
export function periodoLegivel(p) { return p ? `${curto(p.de)} → ${curto(p.ate)}` : ''; }

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
