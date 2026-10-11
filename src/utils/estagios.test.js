// Teste sem dependências: `node --test src/utils/estagios.test.js` (o package.json é "type": "module").
// Cobre (1) o que conta como "Meeting / Visita" nas métricas e (2) que os 2 estágios novos estão em TODAS as telas
// que dependem da lista de estágios, na posição certa (logo antes da Visita Agendada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { contaComoVisita, ESTAGIOS_VISITA } from './estagios.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arq) => readFileSync(join(SRC, arq), 'utf8');

test('Call Agendada e Call Realizado contam como visita, junto com Meeting e Visita Agendada', () => {
  for (const s of ['meeting_agendado', 'call_agendada', 'call_realizado', 'visita_agendada']) assert.equal(contaComoVisita(s), true, s);
  assert.deepEqual(ESTAGIOS_VISITA, ['meeting_agendado', 'call_agendada', 'call_realizado', 'visita_agendada']);
});

test('os demais estágios (e valores estranhos) NÃO contam como visita', () => {
  for (const s of ['aguardando_atendimento', 'tentando_contato', 'material_enviado', 'sem_resposta', 'proposta', 'venda_finalizada', 'descartado', '', undefined, null, 'estagio_do_futuro']) {
    assert.equal(contaComoVisita(s), false, String(s));
  }
});

test('o contador do Dashboard usa a função (nenhuma lista local esquecida)', () => {
  const d = ler('pages/Dashboard.jsx');
  assert.match(d, /_visita:\s+leads\.filter\(\(l\) => contaComoVisita\(l\.status\)\)/);
  assert.doesNotMatch(d, /\['meeting_agendado', 'visita_agendada'\]\.includes/);
});

// ordem das chaves de uma tela: call_agendada, call_realizado e visita_agendada em sequência, depois do meeting
function posicoes(texto) {
  return ['meeting_agendado', 'call_agendada', 'call_realizado', 'visita_agendada'].map((k) => texto.indexOf(`'${k}'`));
}
for (const arq of ['components/KanbanLeads.jsx', 'components/DashboardCharts.jsx', 'pages/Leads.jsx', 'pages/LeadDetalhe.jsx']) {
  test(`${arq}: os dois estágios novos estão logo antes da Visita Agendada`, () => {
    const p = posicoes(ler(arq));
    assert.ok(p.every((x) => x >= 0), `faltou algum estágio em ${arq}: ${p}`);
    assert.ok(p[0] < p[1] && p[1] < p[2] && p[2] < p[3], `ordem errada em ${arq}: ${p}`);
  });
}

test('BadgeStatus tem rótulo e cor para os dois estágios', () => {
  const b = ler('components/BadgeStatus.jsx');
  assert.match(b, /call_agendada: \{\s+label: 'Call Agendada'/);
  assert.match(b, /call_realizado: \{\s+label: 'Call Realizado'/);
});

test('Kanban: estágios desconhecidos aparecem em coluna extra e o arrastar não quebra sem o grupo', () => {
  const k = ler('components/KanbanLeads.jsx');
  assert.match(k, /Object\.keys\(grupos\)\.filter\(\(k\) => !STAGES\.includes\(k\) && grupos\[k\]\?\.total > 0\)/);
  assert.match(k, /if \(!c\[alvo\]\) c\[alvo\] = \{ leads: \[\], total: 0, valorTotal: 0 \}/);
});
