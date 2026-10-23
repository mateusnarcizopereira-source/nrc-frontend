// `node --test src/utils/navGodPainel.test.js` — o item "GOD Painel" aparece no "Mais" só para o editor e a rota continua só dele.
// itensNav é JS puro dentro de um .jsx: extraio o texto da função e executo para cada perfil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = readFileSync(join(SRC, 'components/Layout.jsx'), 'utf8');
const app = readFileSync(join(SRC, 'App.jsx'), 'utf8');

const inicio = layout.indexOf('function itensNav(');
const fim = layout.indexOf('function NavItem(');
const itensNav = new Function(`${layout.slice(inicio, fim)}; return itensNav;`)();

const HIERARQUIA = ['corretor', 'operador', 'gerente', 'diretor', 'editor'];
const nav = (perfil, modoSolo = false) => itensNav({
  modoSolo, usuario: { perfil }, tarefasAtrasadas: 0,
  temPerfil: (min) => HIERARQUIA.indexOf(perfil) >= HIERARQUIA.indexOf(min),
});

test('editor: "GOD Painel" está no menu Mais (grupo Configurações), junto de Relatórios, Motivos Descarte e Corretores', () => {
  for (const modoSolo of [false, true]) {
    const itens = nav('editor', modoSolo);
    const god = itens.find((i) => i.to === '/god');
    assert.ok(god, 'item /god ausente');
    assert.equal(god.label, 'GOD Painel');
    assert.equal(god.grupo, 'Configurações');
    const doGrupo = itens.filter((i) => i.grupo === 'Configurações').map((i) => i.label).sort();
    assert.deepEqual(doGrupo, ['Corretores', 'GOD Painel', 'Motivos Descarte', 'Relatórios']);
    assert.equal(itens.filter((i) => i.to === '/god').length, 1); // uma vez só, e não mais como aba solta
  }
});

test('corretor, operador, gerente e diretor não enxergam o item', () => {
  for (const perfil of ['corretor', 'operador', 'gerente', 'diretor']) {
    assert.equal(nav(perfil).some((i) => i.to === '/god'), false, perfil);
  }
});

test('os demais itens do editor não mudaram de lugar (só o GOD Painel entrou no Mais)', () => {
  const abas = nav('editor').filter((i) => !i.grupo).map((i) => i.label);
  assert.ok(!abas.includes('GOD Painel'));
  for (const l of ['Dashboard', 'Notificações', 'Leads', 'Tarefas', 'Fila', 'Agenda', 'Empreendimentos', 'Radar', 'Visitas', 'Não Clientes', 'Clientes', 'Oferta Ativa']) assert.ok(abas.includes(l), l);
});

test('a rota /god continua só do editor (guarda por perfilMinimo, e editor é o topo da hierarquia)', () => {
  assert.match(app, /<Route path="god" element=\{<Privado perfilMinimo="editor"><GodPainel \/><\/Privado>\} \/>/);
  const auth = readFileSync(join(SRC, 'contexts/AuthContext.jsx'), 'utf8');
  assert.match(auth, /\['corretor', 'operador', 'gerente', 'diretor', 'editor'\]/); // editor é o último: perfilMinimo="editor" só deixa o editor
});
