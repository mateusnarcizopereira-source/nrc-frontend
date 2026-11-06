// `node --test src/utils/avisoDoSistema.test.js`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { descreverAparelho as d, idDoAparelho } from './aparelho.js';
import { tokenAnteriorDe, syncAtualizado, marcarSyncAtualizado } from './pushToken.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(SRC, p), 'utf8');

test('identifica plataforma e navegador', () => {
  const android = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';
  assert.deepEqual([d(android).plataforma, d(android).navegador], ['Android', 'Chrome']);
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17 Mobile Safari/604.1';
  assert.deepEqual([d(iphone).plataforma, d(iphone).navegador], ['iOS', 'Safari']);
  assert.equal(d('Mozilla/5.0 (Linux; Android 14) SamsungBrowser/25 Chrome/121 Safari/537').navegador, 'Samsung');
  assert.equal(d('Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537 Edg/130').navegador, 'Edge');
  assert.equal(d(android, true).instalado, true);
});

test('o id do aparelho é gerado uma vez e sobrevive; sem armazenamento vira null', () => {
  const m = new Map();
  const s = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(idDoAparelho(s, () => 'id-1'), 'id-1');
  assert.equal(idDoAparelho(s, () => 'id-2'), 'id-1');
  assert.equal(idDoAparelho({ getItem: () => { throw new Error('x'); } }), null);
});

test('token anterior: só o que mudou e da mesma conta', () => {
  const g = { token: 'velho', usuarioId: 'u1' };
  assert.equal(tokenAnteriorDe({ guardado: g, tokenAtual: 'novo', usuarioId: 'u1' }), 'velho');
  assert.equal(tokenAnteriorDe({ guardado: g, tokenAtual: 'velho', usuarioId: 'u1' }), null);
  assert.equal(tokenAnteriorDe({ guardado: g, tokenAtual: 'novo', usuarioId: 'u2' }), null);
  assert.equal(tokenAnteriorDe({ guardado: null, tokenAtual: 'novo', usuarioId: 'u1' }), null);
});

test('quem ainda não enviou o formato novo envia na próxima abertura; depois, não', () => {
  const m = new Map();
  const s = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(syncAtualizado(s), false);
  marcarSyncAtualizado(s);
  assert.equal(syncAtualizado(s), true);
});

test('com o app aberto, o aviso sai pelo service worker, com o link e a tag do push', () => {
  const a = ler('services/avisoDoSistema.js');
  assert.ok(a.indexOf('registro.showNotification') < a.indexOf('const aviso = new Notification'));
  const f = ler('components/PushForegroundListener.jsx');
  assert.match(f, /mostrarAvisoDoSistema\(/);
  assert.doesNotMatch(f, /new Notification/);
  assert.match(f, /tag: payload\.data\?\.tag/);
});

test('clique no aviso do SDK com o app já aberto leva ao link', () => {
  const m = ler('main.jsx');
  assert.ok(m.includes("messageType === 'notification-clicked'"));
  assert.ok(m.includes('event.data.fcmOptions?.link'));
});

test('falha ao mostrar o aviso não some: vai para o console e para o backend', () => {
  const a = ler('services/avisoDoSistema.js');
  assert.match(a, /registrarFalhaDeAviso\('mostrar-aviso'/);
  assert.match(a, /api\.post\('\/push\/falha-exibicao'/);
});

test('o tempo real não mostra aviso quando este aparelho já recebe push', () => {
  const c = ler('contexts/NotificacoesContext.jsx');
  assert.match(c, /document\.hidden && !lerGuardado\(localStorage\)\?\.token/);
  assert.doesNotMatch(c, /new Notification/);
});

test('o service worker não mostra o aviso de novo em segundo plano', () => {
  const sw = readFileSync(join(SRC, '../public/sw.js'), 'utf8');
  assert.doesNotMatch(sw, /messaging\.onBackgroundMessage|\.onBackgroundMessage\(/);
  assert.doesNotMatch(sw, /showNotification/);
  assert.match(sw, /firebase\.messaging\(\)/);
});
