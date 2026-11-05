// `node --test src/utils/contatoConcluiTarefa.test.js` — a tela do lead acompanha a conclusão automática da tarefa "Primeiro contato".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const det = readFileSync(join(SRC, 'pages/LeadDetalhe.jsx'), 'utf8');

test('só recarrega se a tarefa automática estiver pendente na tela: nenhuma leitura extra no caso comum', () => {
  assert.match(det, /function atualizarSeTarefaAutomaticaPendente\(\) \{\s*if \(!tarefasLead\.some\(\(t\) => t\.status === 'Pendente' && t\.titulo === 'Primeiro contato' && t\.criadoPorId === 'sistema'\)\) return;/);
});

test('as 4 ações que registram o contato atualizam a tela', () => {
  for (const trecho of [/carregarComentarios\(\); \/\/ mudança de status vira entrada na timeline\s*atualizarSeTarefaAutomaticaPendente\(\);/, /primeiro-contato`\);\s*setLead\(res\.data\);\s*atualizarSeTarefaAutomaticaPendente\(\);/, /setNovoComentario\(''\);\s*atualizarSeTarefaAutomaticaPendente\(\);/, /setVisitas\(\[res\.data, \.\.\.visitas\]\);\s*atualizarSeTarefaAutomaticaPendente\(\);/]) {
    assert.match(det, trecho);
  }
});
