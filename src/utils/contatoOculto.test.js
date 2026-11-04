// `node --test src/utils/contatoOculto.test.js` — contato restrito: tarja no lugar do telefone/e-mail e botões escondidos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arq) => readFileSync(join(SRC, arq), 'utf8');

test('a tarja é fictícia (só pontos), borrada e acessível — nenhum dado real passa por ela', () => {
  const c = ler('components/ContatoOculto.jsx');
  assert.match(c, /blur\(/);
  assert.match(c, /aria-label="Contato restrito"/);
  assert.match(c, /export default function ContatoOculto\(\{ tipo = 'telefone' \}\)/); // só recebe o TIPO: nunca o lead nem o contato
  assert.match(c, /•/);
  assert.doesNotMatch(c, /\d{4}/); // sem dígitos: nada que lembre um número real
});

test('as quatro telas trocam o telefone pela tarja quando contatoOculto é verdadeiro', () => {
  for (const [arq, trecho] of [
    ['pages/Leads.jsx', /lead\.contatoOculto \? \(/],
    ['components/KanbanLeads.jsx', /lead\.contatoOculto \? <ContatoOculto \/> : lead\.telefone/],
    ['pages/LeadsDescartados.jsx', /lead\.contatoOculto \? <ContatoOculto \/> : lead\.telefone/],
    ['pages/LeadDetalhe.jsx', /lead\.contatoOculto \? <ContatoOculto \/> : lead\.telefone/],
  ]) {
    const src = ler(arq);
    assert.match(src, trecho, arq);
    assert.match(src, /import ContatoOculto from/, arq);
  }
  assert.match(ler('pages/LeadDetalhe.jsx'), /lead\.contatoOculto \? <ContatoOculto tipo="email" \/>/);
});

test('Ligar, WhatsApp e E-mail ficam escondidos com contatoOculto (guarda explícita, não só a falta do campo)', () => {
  const det = ler('pages/LeadDetalhe.jsx'); const lista = ler('pages/Leads.jsx');
  assert.match(det, /!lead\.contatoOculto && lead\.telefone && \(\s*<>\s*<BotaoAcaoHeader href=\{`tel:/);
  assert.match(det, /!lead\.contatoOculto && lead\.email && \(\s*<BotaoAcaoHeader href=\{`mailto:/);
  assert.match(lista, /!lead\.contatoOculto && lead\.telefone && \(\s*<a\s+href=\{`https:\/\/wa\.me\//);
});

test('a busca por telefone é ignorada para quem tem contato restrito (o placeholder não promete o que não existe)', () => {
  const lista = ler('pages/Leads.jsx');
  assert.match(lista, /leads\.some\(\(l\) => l\.contatoOculto\) \? 'Buscar por nome, empreendimento\.\.\.'/);
});

test('sem contatoOculto nada muda: as telas continuam mostrando o telefone de sempre', () => {
  assert.match(ler('pages/Leads.jsx'), /<span className="truncate">\{lead\.telefone\}<\/span>/);
  assert.match(ler('pages/LeadDetalhe.jsx'), /: lead\.telefone \},/);
});
