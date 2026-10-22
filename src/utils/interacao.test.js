// `node --test src/utils/interacao.test.js` — data da última interação (relativa até 30 dias, completa depois).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ultimaInteracaoDe, dataCompleta, rotuloInteracao, textoInteracao, LIMITE_RELATIVO_DIAS } from './interacao.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arq) => readFileSync(join(SRC, arq), 'utf8');
const AGORA = new Date('2026-10-23T15:00:00.000Z').getTime();
const atras = (ms) => new Date(AGORA - ms).toISOString();
const MIN = 60e3; const H = 3600e3; const D = 86400e3;

test('relativo: agora, minutos, horas, dias (singular e plural)', () => {
  assert.equal(rotuloInteracao(atras(10e3), AGORA), 'agora');
  assert.equal(rotuloInteracao(atras(5 * MIN), AGORA), 'há 5 min');
  assert.equal(rotuloInteracao(atras(59 * MIN), AGORA), 'há 59 min');
  assert.equal(rotuloInteracao(atras(3 * H), AGORA), 'há 3 h');
  assert.equal(rotuloInteracao(atras(23 * H + 59 * MIN), AGORA), 'há 23 h');
  assert.equal(rotuloInteracao(atras(25 * H), AGORA), 'há 1 dia');
  assert.equal(rotuloInteracao(atras(3 * D), AGORA), 'há 3 dias');
  assert.equal(rotuloInteracao(atras(LIMITE_RELATIVO_DIAS * D), AGORA), 'há 30 dias');
});

test('acima de 30 dias vira a data completa (dd/mm/aaaa)', () => {
  const r = rotuloInteracao(atras(31 * D), AGORA);
  assert.match(r, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.equal(r, dataCompleta(atras(31 * D)).slice(0, 10));
});

test('data completa com hora: dd/mm/aaaa hh:mm; entradas inválidas não quebram', () => {
  assert.match(dataCompleta('2026-10-10T15:31:00.000Z'), /^\d{2}\/\d{2}\/2026 \d{2}:\d{2}$/);
  assert.equal(dataCompleta(null), '—');
  assert.equal(dataCompleta('lixo'), '—');
  assert.equal(rotuloInteracao(null, AGORA), '');
  assert.equal(rotuloInteracao('lixo', AGORA), '');
});

test('relógio do aparelho adiantado (data no futuro) não gera "há -N": vira "agora"', () => {
  assert.equal(rotuloInteracao(new Date(AGORA + 5 * MIN).toISOString(), AGORA), 'agora');
});

test('usa ultimaInteracao e, sem ela, a data de criação; sem nenhuma das duas, não mostra nada', () => {
  assert.equal(ultimaInteracaoDe({ ultimaInteracao: 'A', criadoEm: 'B' }), 'A');
  assert.equal(ultimaInteracaoDe({ criadoEm: 'B' }), 'B');
  assert.equal(ultimaInteracaoDe({}), null);
  assert.equal(ultimaInteracaoDe(undefined), null);
  assert.equal(textoInteracao({ ultimaInteracao: atras(3 * D) }, AGORA), 'Última interação: há 3 dias');
  assert.equal(textoInteracao({ criadoEm: atras(2 * H) }, AGORA), 'Última interação: há 2 h');
  assert.equal(textoInteracao({}, AGORA), '');
});

// ── integração entre arquivos ──
test('lista, Kanban e detalhe usam o mesmo util, com a data completa no tooltip/detalhe', () => {
  const lista = ler('pages/Leads.jsx'); const kanban = ler('components/KanbanLeads.jsx'); const det = ler('pages/LeadDetalhe.jsx');
  for (const [nome, src] of [['Leads.jsx', lista], ['KanbanLeads.jsx', kanban]]) {
    assert.match(src, /textoInteracao\(lead\)/, nome);
    assert.match(src, /title=\{`Última interação em \$\{dataCompleta\(ultimaInteracaoDe\(lead\)\)\}`\}/, nome);
  }
  assert.match(det, /Última interação: \{dataCompleta\(ultimaInteracaoDe\(lead\)\)\} \(\{rotuloInteracao\(ultimaInteracaoDe\(lead\)\)\}\)/);
});

test('nenhuma leitura extra: os componentes só usam o que a listagem já traz (sem novas chamadas à API)', () => {
  assert.doesNotMatch(ler('utils/interacao.js'), /api\.|fetch\(|axios/);
  for (const arq of ['pages/Leads.jsx', 'components/KanbanLeads.jsx']) {
    const src = ler(arq);
    assert.equal((src.match(/api\.get\(/g) || []).length, arq === 'pages/Leads.jsx' ? 1 : 2, `${arq}: número de GETs mudou`); // Leads: /leads | Kanban: /leads/kanban + /motivos-descarte
  }
});
