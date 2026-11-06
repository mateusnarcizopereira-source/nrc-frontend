// `node --test src/utils/filaPorEmpreendimento.test.js` — telas da Fila e do Dashboard com a fila por empreendimento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const fila = readFileSync(join(SRC, 'pages/OperadorFila.jsx'), 'utf8');
const dash = readFileSync(join(SRC, 'pages/Dashboard.jsx'), 'utf8');

test('sem `filas` na resposta (flag desligada), a tela usa a fila única de sempre', () => {
  assert.match(fila, /const ordem = filas \? \(filaAtiva\?\.ordem \|\| \[\]\) : \(dados\?\.ordem \|\| \[\]\);/);
  assert.match(fila, /filaAtiva \? filaAtiva\.nome : 'Ordem de hoje'/);
  assert.match(fila, /!filas \? 'Ninguém bateu ponto hoje\.'/);
});

test('com `filas`, mostra uma aba por fila recebida, e mover vale só para a fila aberta', () => {
  assert.match(fila, /filas\.map\(\(f\) => \(\s*<button key=\{f\.chave\} role="tab"/);
  assert.match(fila, /\.\.\.\(filaAtiva \? \{ chave: filaAtiva\.chave \} : \{\}\)/);
});

test('a tela não filtra fila por conta própria: quem decide o que o corretor vê é o backend', () => {
  assert.doesNotMatch(fila, /empreendimentosAtendidos/);
});

test('Dashboard: próximo de cada empreendimento, de forma compacta; sem `filas`, o widget de sempre', () => {
  assert.match(dash, /fila\.filas \? \(/);
  assert.match(dash, /f\.ordem\[0\] \? f\.ordem\[0\]\.corretorNome\.split\(' '\)\[0\] : '—'/);
  assert.match(dash, /fila\.ordem\.map\(\(c, i\) => \(/);
  assert.match(dash, /ordem\?\.length \|\| filaRes\.data\?\.filas\?\.length/);
});
