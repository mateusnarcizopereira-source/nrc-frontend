// `node --test src/utils/notificacoes.test.js` — abas e contadores do sino.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ehLead, filtrarPorGrupo, contarDaLista, contadoresAposNova, contadoresAposLida, CONTADORES_ZERO } from './notificacoes.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const n = (tipo, lida = false, id = tipo + Math.random()) => ({ id, tipo, lida });
const LISTA = [n('lead_novo'), n('tarefa_vencendo'), n('lead_repassado'), n('lead_parado'), n('sorteio'), n('lead_novo', true), n('tarefa_atrasada')];

test('lead novo e lead repassado são "leads"; o resto é "outras"', () => {
  assert.equal(ehLead('lead_novo'), true);
  assert.equal(ehLead('lead_repassado'), true);
  for (const t of ['lead_parado', 'tarefa_vencendo', 'tarefa_atrasada', 'sorteio', 'info', undefined]) assert.equal(ehLead(t), false, String(t));
});

test('cada aba mostra só o seu grupo e nada se perde entre as duas', () => {
  const leads = filtrarPorGrupo(LISTA, 'leads'); const outras = filtrarPorGrupo(LISTA, 'outras');
  assert.deepEqual(leads.map((x) => x.tipo).sort(), ['lead_novo', 'lead_novo', 'lead_repassado']);
  assert.equal(outras.length, 4);
  assert.equal(leads.length + outras.length, LISTA.length);
  assert.deepEqual(filtrarPorGrupo(undefined, 'leads'), []);
});

test('contadores: o número do sino conta só leads não lidos; o total fica como secundário', () => {
  assert.deepEqual(contarDaLista(LISTA), { naoLidas: 6, naoLidasLeads: 2 });
  assert.deepEqual(contarDaLista([]), CONTADORES_ZERO);
});

test('notificação nova (tempo real): soma no total e, se for de lead, nos leads', () => {
  assert.deepEqual(contadoresAposNova({ naoLidas: 5, naoLidasLeads: 2 }, n('lead_novo')), { naoLidas: 6, naoLidasLeads: 3 });
  assert.deepEqual(contadoresAposNova({ naoLidas: 5, naoLidasLeads: 2 }, n('tarefa_vencendo')), { naoLidas: 6, naoLidasLeads: 2 });
});

test('marcar como lida: só desconta se estava não lida, nunca fica negativo', () => {
  assert.deepEqual(contadoresAposLida({ naoLidas: 5, naoLidasLeads: 2 }, n('lead_repassado')), { naoLidas: 4, naoLidasLeads: 1 });
  assert.deepEqual(contadoresAposLida({ naoLidas: 5, naoLidasLeads: 2 }, n('lead_novo', true)), { naoLidas: 5, naoLidasLeads: 2 });
  assert.deepEqual(contadoresAposLida({ naoLidas: 5, naoLidasLeads: 2 }, undefined), { naoLidas: 5, naoLidasLeads: 2 });
  assert.deepEqual(contadoresAposLida({ naoLidas: 0, naoLidasLeads: 0 }, n('lead_novo')), { naoLidas: 0, naoLidasLeads: 0 });
});

test('o sino usa as abas, o contador de leads no número vermelho e "marcar todas como lidas"', () => {
  const s = readFileSync(join(SRC, 'components/SinoNotificacoes.jsx'), 'utf8');
  assert.match(s, /filtrarPorGrupo\(lista, aba\)/);
  assert.match(s, /\['leads', 'Leads', naoLidas\], \['outras', 'Outras', naoLidasOutras\]/);
  assert.match(s, /naoLidas > 9 \? '9\+' : naoLidas/); // badge = leads
  assert.match(s, /naoLidasTotal > 0[\s\S]{0,200}Marcar todas como lidas/);
  const c = readFileSync(join(SRC, 'contexts/NotificacoesContext.jsx'), 'utf8');
  assert.match(c, /const naoLidas = contadores\.naoLidasLeads/);
  assert.match(c, /api\.get\('\/notificacoes\/contador'\)/);
});

test('o sino só mostra os campos que a notificação já tinha (título, mensagem, hora): nenhum campo novo de cliente', () => {
  const s = readFileSync(join(SRC, 'components/SinoNotificacoes.jsx'), 'utf8');
  assert.doesNotMatch(s, /telefone|\.email|lead\.nome|cliente/i);
});
