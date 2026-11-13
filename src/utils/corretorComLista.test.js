// `node --test src/utils/corretorComLista.test.js` — Clientes e Oferta Ativa fora do menu e das rotas de quem tem empreendimentosAtendidos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(SRC, 'App.jsx'), 'utf8');
const layout = readFileSync(join(SRC, 'components/Layout.jsx'), 'utf8');

test('menu: Clientes e Oferta Ativa só para quem não tem a lista', () => {
  assert.match(layout, /includes\(perfil\) && !Array\.isArray\(usuario\?\.empreendimentosAtendidos\)\) \{\s+itens\.push\(\{ to: '\/clientes'[^\n]+\n\s+itens\.push\(\{ to: '\/campanhas'/);
});

test('rotas: as quatro telas redirecionam quem tem a lista', () => {
  for (const tela of ['Clientes', 'ClienteDetalhe', 'Campanhas', 'CampanhaDiscador']) {
    assert.match(app, new RegExp(`semListaDeEmpreendimentos><${tela} />`));
  }
  assert.match(app, /semListaDeEmpreendimentos && Array\.isArray\(usuario\.empreendimentosAtendidos\)/);
});

test('Radar continua aberto', () => {
  assert.match(app, /perfisPermitidos=\{PODE_RADAR\}><Radar \/>/);
});
