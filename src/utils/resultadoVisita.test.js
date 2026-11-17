// `node --test src/utils/resultadoVisita.test.js` — botões de resultado da visita nas três telas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(SRC, p), 'utf8').replace(/\r\n/g, '\n');
const comp = ler('components/ResultadoVisita.jsx');

test('os dois botões chamam a mesma rota, com o resultado', () => {
  assert.ok(comp.includes('Visita realizada') && comp.includes('Visita não realizada'));
  assert.match(comp, /api\.post\(`\/visitas\/\$\{visita\.id\}\/resultado`, \{ resultado \}\)/);
});

test('visita já marcada mostra a marca e não os botões', () => {
  assert.match(comp, /if \(visita\.resultado\) \{/);
});

test('quem pode marcar: gerente, editor e o corretor do lead; diretor não', () => {
  const ini = comp.indexOf('export function podeMarcarVisita'); const fim = comp.indexOf('\n}\n', ini) + 3;
  // eslint-disable-next-line no-new-func
  const pode = new Function(`${comp.slice(ini, fim).replace('export ', '')}; return podeMarcarVisita;`)();
  assert.equal(pode({ perfil: 'gerente' }, 'x'), true);
  assert.equal(pode({ perfil: 'editor' }, null), true);
  assert.equal(pode({ id: 'c1', perfil: 'corretor' }, 'c1'), true);
  assert.equal(pode({ id: 'c1', perfil: 'corretor' }, 'c2'), false);
  assert.equal(pode({ id: 'd', perfil: 'diretor' }, 'd'), false);
});

test('aparece no detalhe do lead, na Agenda e no Painel de Visitas (só gerente e editor ali)', () => {
  assert.match(ler('pages/LeadDetalhe.jsx'), /<ResultadoVisita visita=\{entry\.item\}/);
  assert.match(ler('pages/Agenda.jsx'), /<ResultadoVisita visita=\{e\.visita\}/);
  const p = ler('pages/PainelVisitas.jsx');
  assert.match(p, /<ResultadoVisita visita=\{v\} podeMarcar=\{podeMarcar\}/);
  assert.match(p, /const podeMarcar = \['gerente', 'editor'\]\.includes\(usuario\?\.perfil\)/);
});

test('dentro do link da Agenda, clicar no botão não navega', () => {
  assert.match(comp, /ev\.preventDefault\(\); ev\.stopPropagation\(\);/);
});
