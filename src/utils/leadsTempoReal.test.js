// `node --test src/utils/leadsTempoReal.test.js`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { aplicarLeadNovo as novo, aplicarLeadAtualizado as atualizado } from './leadsTempoReal.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const corretor = { id: 'c1', perfil: 'corretor' };
const lead = (id, corretorId, extra = {}) => ({ id, corretorId, status: 'novo', ...extra });
const ids = (l) => l.map((x) => x.id).join();

test('corretor: lead novo só entra se for dele', () => {
  assert.equal(ids(novo([], lead('a', 'c2'), corretor)), '');
  assert.equal(ids(novo([], lead('a', null), corretor)), '');
  assert.equal(ids(novo([lead('b', 'c1')], lead('a', 'c1'), corretor)), 'a,b');
});

test('corretor: repassado sai da lista; distribuído a ele entra; lead de outro nunca entra', () => {
  assert.equal(ids(atualizado([lead('a', 'c1')], lead('a', 'c2'), corretor)), '');
  assert.equal(ids(atualizado([], lead('a', 'c1'), corretor)), 'a');
  assert.equal(ids(atualizado([lead('b', 'c1')], lead('a', 'c2'), corretor)), 'b');
});

test('quem gerencia: igual a antes, lead novo sempre entra e atualizado só troca o que já está na lista', () => {
  for (const perfil of ['gerente', 'editor', 'diretor']) {
    const u = { id: 'g', perfil };
    assert.equal(ids(novo([lead('b', 'c1')], lead('a', 'c2'), u)), 'a,b');
    assert.equal(ids(atualizado([lead('b', 'c1')], lead('a', 'c2'), u)), 'b');
    assert.equal(atualizado([lead('a', 'c1')], lead('a', 'c2', { status: 'proposta' }), u)[0].status, 'proposta');
  }
});

test('o mesmo lead não aparece duas vezes', () => {
  assert.equal(ids(novo([lead('a', 'c1')], lead('a', 'c1'), corretor)), 'a');
});

test('atualização mantém o que só a API traz (telefone, e-mail, notas)', () => {
  const r = atualizado([lead('a', 'c1', { telefone: 'x', notas: 'y' })], lead('a', 'c1', { status: 'proposta' }), corretor)[0];
  assert.deepEqual([r.telefone, r.notas, r.status], ['x', 'y', 'proposta']);
});

test('o socket envia o token, lido a cada tentativa, e não desiste em falha passageira', () => {
  const s = readFileSync(join(SRC, 'services/socket.js'), 'utf8');
  assert.match(s, /auth: \(cb\) => cb\(\{ token: localStorage\.getItem\('nrc_token'\) \}\)/);
  assert.match(s, /conferirLogin/);
  assert.ok(s.includes("erro.message === 'nao_autorizado') { conferirLogin(); return; }"));
  assert.ok(s.includes('if (socket.active) return;'));
  assert.ok(s.includes("motivo === 'io server disconnect') conferirLogin()"));
});

test('o Dashboard usa estas regras nos três eventos de lead', () => {
  const d = readFileSync(join(SRC, 'pages/Dashboard.jsx'), 'utf8');
  assert.match(d, /'lead_novo',\s+\(lead\) => setLeads\(\(prev\) => aplicarLeadNovo\(prev, lead, usuario\)\)/);
  assert.match(d, /'lead_atualizado',\s+\(lead\) => setLeads\(\(prev\) => aplicarLeadAtualizado\(prev, lead, usuario\)\)/);
  assert.match(d, /'lead_atribuido',\s+\(lead\) => setLeads\(\(prev\) => aplicarLeadAtualizado\(prev, lead, usuario\)\)/);
});
