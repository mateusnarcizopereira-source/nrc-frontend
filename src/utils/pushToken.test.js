// `node --test src/utils/pushToken.test.js` — regras do token de push + garantias de que as telas novas não exibem dado de cliente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  lerGuardado, gravarGuardado, limparGuardado, podePularVerificacao, precisaEnviar, INTERVALO_VERIFICAR_MS, INTERVALO_REENVIAR_MS,
} from './pushToken.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arq) => readFileSync(join(SRC, arq), 'utf8');
const semComentarios = (txt) => txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const storageFalso = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };
const AGORA = 1_000_000_000_000;

test('guardar, ler e limpar o token deste aparelho', () => {
  const s = storageFalso();
  assert.equal(lerGuardado(s), null);
  gravarGuardado(s, { token: 'tk1', usuarioId: 'u1', em: AGORA });
  assert.deepEqual(lerGuardado(s), { token: 'tk1', usuarioId: 'u1', em: AGORA });
  limparGuardado(s);
  assert.equal(lerGuardado(s), null);
  assert.equal(s._m.size, 0);
});

test('storage quebrado nunca lança (modo privado/bloqueado)', () => {
  const ruim = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  assert.equal(lerGuardado(ruim), null);
  assert.doesNotThrow(() => gravarGuardado(ruim, { token: 't', usuarioId: 'u', em: 1 }));
  assert.doesNotThrow(() => limparGuardado(ruim));
});

test('login/abertura: sem registro anterior sempre envia; sem token do FCM nunca envia', () => {
  assert.equal(precisaEnviar({ tokenAtual: 'tk', guardado: null, usuarioId: 'u1', agora: AGORA }), true);
  assert.equal(precisaEnviar({ tokenAtual: null, guardado: null, usuarioId: 'u1', agora: AGORA }), false);
});

test('mesmo token, mesma conta, recente: não envia (zero leitura no backend)', () => {
  const g = { token: 'tk', usuarioId: 'u1', em: AGORA - 3600e3 };
  assert.equal(precisaEnviar({ tokenAtual: 'tk', guardado: g, usuarioId: 'u1', agora: AGORA }), false);
  assert.equal(podePularVerificacao({ guardado: g, usuarioId: 'u1', agora: AGORA }), true);
});

test('o FCM renovou o token: envia o novo', () => {
  const g = { token: 'velho', usuarioId: 'u1', em: AGORA - 3600e3 };
  assert.equal(precisaEnviar({ tokenAtual: 'novo', guardado: g, usuarioId: 'u1', agora: AGORA }), true);
});

test('outra conta no mesmo aparelho (ex.: corretor → editor): envia e não pula a verificação', () => {
  const g = { token: 'tk', usuarioId: 'corretor', em: AGORA - 60e3 };
  assert.equal(precisaEnviar({ tokenAtual: 'tk', guardado: g, usuarioId: 'editor', agora: AGORA }), true);
  assert.equal(podePularVerificacao({ guardado: g, usuarioId: 'editor', agora: AGORA }), false);
});

test('confirmação diária: depois de 24 h reenvia mesmo sem mudança; depois de 12 h volta a consultar o FCM', () => {
  const g = { token: 'tk', usuarioId: 'u1', em: AGORA - INTERVALO_REENVIAR_MS };
  assert.equal(precisaEnviar({ tokenAtual: 'tk', guardado: g, usuarioId: 'u1', agora: AGORA }), true);
  assert.equal(podePularVerificacao({ guardado: { ...g, em: AGORA - INTERVALO_VERIFICAR_MS }, usuarioId: 'u1', agora: AGORA }), false);
});

test('forçar (login) ignora o cache', () => {
  const g = { token: 'tk', usuarioId: 'u1', em: AGORA - 1000 };
  assert.equal(precisaEnviar({ tokenAtual: 'tk', guardado: g, usuarioId: 'u1', agora: AGORA, forcar: true }), true);
  assert.equal(podePularVerificacao({ guardado: g, usuarioId: 'u1', agora: AGORA, forcar: true }), false);
});

// ── integração entre arquivos (verificação estática, sem navegador) ──
test('AuthContext: sincroniza ao entrar/abrir/voltar à aba e remove o token ANTES de apagar o JWT no logout', () => {
  const a = ler('contexts/AuthContext.jsx');
  assert.match(a, /sincronizarToken\(usuario\)/);
  assert.match(a, /visibilitychange/);
  const logout = a.slice(a.indexOf('function logout()'), a.indexOf('const temPerfil'));
  assert.ok(logout.indexOf('removerTokenDoAparelho(localStorage.getItem(\'nrc_token\'))') >= 0, 'logout não remove o token');
  assert.ok(logout.indexOf('removerTokenDoAparelho') < logout.indexOf("localStorage.removeItem('nrc_token')"), 'o JWT é apagado antes de remover o token');
});

test('ativação manual (tela Notificações e convite) guarda o token para o logout saber qual remover', () => {
  assert.match(ler('pages/Notificacoes.jsx'), /registrarTokenNoBackend\(usuario\?\.id, token\)/);
  assert.match(ler('components/NotificacoesPushPrompt.jsx'), /registrarTokenNoBackend\(usuario\?\.id, token\)/);
});

test('telas novas do GOD Painel não têm nenhum campo de cliente (só corretores, contagens e ids)', () => {
  for (const arq of ['components/CorretoresSemPush.jsx', 'components/SaudeDoPush.jsx']) {
    const c = semComentarios(ler(arq));
    assert.doesNotMatch(c, /telefone|e-?mail|nome_completo|lead\.nome|leadId|leadNome|cliente\.|\.cpf/i, `${arq} referencia dado de cliente`);
  }
  assert.doesNotMatch(ler('components/CorretoresSemPush.jsx'), /fcmTokens|token\b/); // tampouco tokens
});

test('GodPainel usa a lista de usuários que já existe (sem chamada extra) para "corretores sem push"', () => {
  const g = ler('pages/GodPainel.jsx');
  assert.match(g, /<CorretoresSemPush usuarios=\{usuarios\} \/>/);
  assert.match(g, /<SaudeDoPush usuarios=\{usuarios\} \/>/);
  assert.doesNotMatch(ler('components/CorretoresSemPush.jsx'), /api\./);
  assert.match(ler('components/SaudeDoPush.jsx'), /api\.get\('\/push\/saude'\)/);
  assert.doesNotMatch(ler('components/SaudeDoPush.jsx'), /useEffect/); // só carrega ao clicar
});
