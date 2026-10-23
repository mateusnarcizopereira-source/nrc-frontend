// `node --test src/utils/radarDoDia.test.js` — texto do "Copiar relatório" do Radar do dia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { montarRelatorio, dataComPontos, construtorasDoRelatorio, periodoLegivel } from './radarDoDia.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arq) => readFileSync(join(SRC, arq), 'utf8');

test('data com pontos', () => {
  assert.equal(dataComPontos('2026-10-22'), '22.10.2026');
  assert.equal(dataComPontos(''), '');
  assert.equal(dataComPontos(undefined), '');
});

test('formato exato do relatório: só Leads preenchido, nome em negrito, linha de traços entre os blocos', () => {
  const texto = montarRelatorio('2026-10-22', [{ construtora: 'WDS', leads: 7 }, { construtora: 'Helbor', leads: 12 }]);
  const esperado = [
    'Radar On Empyrus', '', 'Data:     22.10.2026', '',
    '*WDS*', '',
    'Leads:                  07',
    'Agendamentos:  00',
    'Visitas:                 00',
    'Propostas:           00',
    'Vendas:                00',
    '', '——————————', '',
    '*Helbor*', '',
    'Leads:                  12',
    'Agendamentos:  00',
    'Visitas:                 00',
    'Propostas:           00',
    'Vendas:                00',
    '', '——————————', '',
  ].join('\n').replace(/\n+$/, '\n');
  assert.equal(texto, esperado);
});

test('"Sem empreendimento" e construtoras sem lead nunca entram no texto copiado', () => {
  const lista = [{ construtora: 'WDS', leads: 3 }, { construtora: 'Sem empreendimento', leads: 9 }, { construtora: 'Helbor', leads: 0 }];
  assert.deepEqual(construtorasDoRelatorio(lista), [{ construtora: 'WDS', leads: 3 }]);
  const texto = montarRelatorio('2026-10-22', lista);
  assert.ok(!texto.includes('Sem empreendimento'));
  assert.ok(!texto.includes('Helbor'));
  assert.ok(texto.includes('*WDS*'));
});

test('três ou mais leads passam de dois dígitos sem quebrar; zero vira 00', () => {
  assert.match(montarRelatorio('2026-10-22', [{ construtora: 'A', leads: 123 }]), /Leads:\s+123\n/);
  assert.equal(montarRelatorio('2026-10-22', []).includes('*'), false);
});

test('integração: o card está no GOD Painel, consulta só em ação do usuário (sem laço/tempo) e não copia o dia em andamento', () => {
  const god = ler('pages/GodPainel.jsx'); const card = ler('components/RadarDoDia.jsx');
  assert.match(god, /<RadarDoDia \/>/);
  assert.doesNotMatch(card, /setInterval|setTimeout\([^)]*carregar|useEffect/); // o setTimeout existente só apaga a mensagem "copiado"
  assert.equal((card.match(/api\.get\(/g) || []).length, 1);
  assert.match(card, /max=\{dados\.ultimoFechado\}/); // seletor só aceita dias fechados
  assert.match(card, /parcial, até \{dados\.hoje\.parcialAte\}/);
  const trechoHoje = card.slice(card.indexOf('<section'), card.indexOf('Dia fechado'));
  assert.doesNotMatch(trechoHoje, /Copiar relatório/);
});

test('período legível: 21/10 22:01 → 22/10 22:00; entrada vazia não quebra', () => {
  assert.equal(periodoLegivel({ de: '2026-10-21T22:01', ate: '2026-10-22T22:00' }), '21/10 22:01 → 22/10 22:00');
  assert.equal(periodoLegivel(undefined), '');
});

test('a tela não fala mais em "fora da janela" nem usa o total da janela 10h–22h; mostra o período e o total', () => {
  const card = ler('components/RadarDoDia.jsx');
  assert.doesNotMatch(card, /foraDaJanela|totalJanela|janelaInicio|janelaFim|Fora da janela/);
  assert.match(card, /Período: \{periodoLegivel\(dados\.periodo\)\}/);
  assert.match(card, /Total do período[\s\S]*dados\.total/);
});
