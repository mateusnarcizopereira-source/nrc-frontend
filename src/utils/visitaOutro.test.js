// `node --test src/utils/visitaOutro.test.js` — cadastro de visita com empreendimento do CRM ou "Outro".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const tela = readFileSync(join(SRC, 'pages/LeadDetalhe.jsx'), 'utf8').replace(/\r\n/g, '\n'); // o checkout do git pode vir com CRLF

test('o campo tem "Outro" e, com ele, o texto obrigatório "Especifique o empreendimento"', () => {
  assert.match(tela, /<option value=\{OUTRO\}>Outro<\/option>/);
  assert.ok(tela.includes('Especifique o empreendimento'));
  assert.match(tela, /visitaForm\.empreendimentoId === OUTRO && \(/);
  assert.match(tela, /<input className="input" required maxLength=\{120\}/);
});

test('o formulário de visita não cria empreendimento (sem o seletor que cadastrava)', () => {
  assert.doesNotMatch(tela, /SeletorEmpreendimento/);
});

test('o corpo enviado: Outro vai sem vínculo e com o nome digitado; cadastrado vai com o id e o nome do cadastro', () => {
  const ini = tela.indexOf('export function corpoDaVisita'); const fim = tela.indexOf('\n}\n', ini) + 3;
  const OUTRO = '__outro__';
  // eslint-disable-next-line no-new-func
  const corpoDaVisita = new Function('OUTRO', `${tela.slice(ini, fim).replace('export ', '')}; return corpoDaVisita;`)(OUTRO);
  const base = { data: '2031-01-01', hora: '10:00', comentario: 'c', gerenteId: 'g' };
  assert.deepEqual(corpoDaVisita({ ...base, empreendimentoId: OUTRO, outroNome: '  Edifício X  ' }, []), { ...base, empreendimentoOutro: true, empreendimento: 'Edifício X' });
  assert.deepEqual(corpoDaVisita({ ...base, empreendimentoId: 'E1', outroNome: '' }, [{ id: 'E1', nome: 'Newtown SP' }]), { ...base, empreendimentoId: 'E1', empreendimento: 'Newtown SP' });
});
