import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import SinoNotificacoes from './SinoNotificacoes';
import TrocarSenha from '../pages/TrocarSenha';
import Avatar from './Avatar';
import logoIcon from '../assets/logo-nrc-icon.svg';
import { processarFotoPerfil } from '../utils/foto';

// ─── Itens de navegação por perfil ─────────────────────────────
// Mesma allow-list de sempre (espelha exigirPerfis do backend e
// perfisPermitidos do App.jsx) — só muda a APRESENTAÇÃO (Fase 1).
// `grupo` null = vira aba direta na barra horizontal (desktop) ou item
// solto no menu mobile; `grupo` preenchido = cai dentro do dropdown
// "Mais" (desktop) — é assim que resolvemos "itens não cabem" sem
// rolagem horizontal nem submenu fixo: perfis com mais telas (editor/
// GOD) naturalmente empurram mais coisa pro Mais.
function itensNav({ modoSolo, usuario, temPerfil, tarefasAtrasadas }) {
  const perfil = usuario?.perfil;
  const itens = [
    { to: '/', icon: 'layout-dashboard', label: 'Dashboard', end: true, grupo: null },
    // Notificações — aba visível pra TODOS os perfis (espelha App.jsx, rota
    // sem allow-list nenhuma), diferente de todo o resto abaixo que varia
    // por perfil.
    { to: '/notificacoes', icon: 'bell-ringing', label: 'Notificações', grupo: null },
  ];

  if (perfil !== 'operador') {
    itens.push({ to: '/leads', icon: 'users', label: 'Leads', grupo: null });
    itens.push({ to: '/tarefas', icon: 'checklist', label: 'Tarefas', grupo: null, badge: tarefasAtrasadas });
  }

  // Fila — presença ao vivo (ajuste presença/fila, item 2). Agora também
  // visível pro corretor (allow-list igual ao backend: operador/corretor/
  // gerente/editor; diretor bloqueado). Rótulo simplificado de "Fila de
  // Corretores" pra só "Fila", como pedido.
  if (!modoSolo && ['operador', 'corretor', 'gerente', 'editor'].includes(perfil)) {
    itens.push({ to: '/operador', icon: 'arrows-sort', label: 'Fila', grupo: null });
  }

  if (['corretor', 'gerente', 'editor'].includes(perfil)) {
    itens.push({ to: '/agenda', icon: 'calendar', label: 'Agenda', grupo: null });
  }

  // Empreendimentos — leitura já era liberada pro corretor na API (GET sem
  // exigirPerfis); só a aba não aparecia. Ajuste nav round 3, item 1: agora
  // aparece pra corretor também (edição continua só gerente/editor, resolvido
  // dentro de Empreendimentos.jsx, não muda aqui).
  if (['corretor', 'gerente', 'editor'].includes(perfil)) {
    itens.push({ to: '/empreendimentos', icon: 'building-community', label: 'Empreendimentos', grupo: null });
  }

  // Ajuste nav round 3: corretor e gerente perdem o "Mais" inteiramente —
  // tudo que cada um já acessava vira aba lado a lado. Editor mantém um
  // "Mais" enxuto só com os 3 itens de configuração menos usados no dia a
  // dia. Diretor (não citado no pedido) mantém o comportamento de sempre,
  // sem alteração — ver bloco `else if` abaixo.
  if (perfil === 'gerente') {
    itens.push({ to: '/visitas', icon: 'calendar-event', label: 'Visitas', grupo: null });
    itens.push({ to: '/leads-descartados', icon: 'ban', label: 'Não Clientes', grupo: null });
    itens.push({ to: '/corretores', icon: 'user-check', label: 'Corretores', grupo: null });
    itens.push({ to: '/relatorios', icon: 'chart-bar', label: 'Relatórios', grupo: null });
    itens.push({ to: '/motivos-descarte', icon: 'adjustments-horizontal', label: 'Motivos Descarte', grupo: null });
  } else if (perfil === 'editor') {
    itens.push({ to: '/visitas', icon: 'calendar-event', label: 'Visitas', grupo: null });
    itens.push({ to: '/leads-descartados', icon: 'ban', label: 'Não Clientes', grupo: null });
    itens.push({ to: '/relatorios', icon: 'chart-bar', label: 'Relatórios', grupo: 'Configurações' });
    itens.push({ to: '/motivos-descarte', icon: 'adjustments-horizontal', label: 'Motivos Descarte', grupo: 'Configurações' });
    itens.push({ to: '/corretores', icon: 'user-check', label: 'Corretores', grupo: 'Configurações' });
  } else if (temPerfil('gerente')) {
    // Diretor (único perfil que chega aqui: acima de gerente, mas não editor)
    // — grupo "Gestão" no Mais, exatamente como era antes deste ajuste.
    // "Corretores" NÃO entra aqui (achado ao corrigir o link morto do
    // gerente): diretor é só-leitura no sistema e nunca teve acesso à
    // rota — o item ficava no menu sem levar a lugar nenhum, mesmo bug
    // que o gerente tinha, só que pra outro perfil.
    itens.push({ to: '/empreendimentos', icon: 'building-community', label: 'Empreendimentos', grupo: 'Gestão' });
    itens.push({ to: '/visitas', icon: 'calendar-event', label: 'Visitas', grupo: 'Gestão' });
    itens.push({ to: '/leads-descartados', icon: 'ban', label: 'Não Clientes', grupo: 'Gestão' });
    itens.push({ to: '/relatorios', icon: 'chart-bar', label: 'Relatórios', grupo: 'Gestão' });
    itens.push({ to: '/motivos-descarte', icon: 'adjustments-horizontal', label: 'Motivos Descarte', grupo: 'Gestão' });
  }

  // Allow-list — mesma lista do backend (exigirPerfis) e do App.jsx (perfisPermitidos).
  // Sempre lado a lado agora — corretor/gerente perderam o Mais, editor já
  // não agrupava isso.
  if (['corretor', 'gerente', 'editor'].includes(perfil)) {
    itens.push({ to: '/clientes', icon: 'address-book', label: 'Clientes', grupo: null });
    itens.push({ to: '/campanhas', icon: 'speakerphone', label: 'Oferta Ativa', grupo: null });
  }

  if (perfil === 'editor') {
    itens.push({ to: '/god', icon: 'settings', label: 'GOD Painel', grupo: null });
  }

  return itens;
}

function NavItem({ to, icon, label, end = false, onClick, badge = 0 }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
      style={{ minHeight: '44px' }}
    >
      <i className={`ti ti-${icon} text-[18px] flex-shrink-0`} aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#fff', minWidth: '18px', textAlign: 'center' }}>
          {badge}
        </span>
      )}
    </NavLink>
  );
}

function NavGroup({ label }) {
  return (
    <p className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
      style={{ color: 'var(--text-faint)' }}>
      {label}
    </p>
  );
}

// Menu mobile (overlay full-list) — inalterado na estrutura, só lê a lista nova.
function SidebarNav({ itens, onItemClick }) {
  let grupoAtual = null;
  return (
    <>
      {itens.map((item) => {
        const mudouGrupo = item.grupo !== grupoAtual;
        grupoAtual = item.grupo;
        return (
          <div key={item.to}>
            {mudouGrupo && item.grupo && <NavGroup label={item.grupo} />}
            <NavItem {...item} onClick={onItemClick} />
          </div>
        );
      })}
    </>
  );
}

// ─── Abas horizontais desktop + dropdown "Mais" ────────────────
function TabItem({ to, icon, label, end = false, badge = 0 }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `tab-link${isActive ? ' tab-link-active' : ''}`}>
      <i className={`ti ti-${icon} text-[16px]`} aria-hidden="true" />
      {label}
      {badge > 0 && (
        <span className="text-[10px] font-bold px-1.5 rounded-full flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#fff', minWidth: '16px', textAlign: 'center' }}>
          {badge}
        </span>
      )}
    </NavLink>
  );
}

function TopTabsNav({ itens }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => {
    function fecharSeFora(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener('mousedown', fecharSeFora);
    return () => document.removeEventListener('mousedown', fecharSeFora);
  }, []);
  useEffect(() => setAberto(false), [location.pathname]);

  const primarios = itens.filter((i) => !i.grupo);
  const noMais = itens.filter((i) => i.grupo);
  const algumAtivoNoMais = noMais.some((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));

  let grupoAtual = null;
  return (
    <nav className="flex items-stretch gap-1 min-w-0">
      <div className="flex items-stretch gap-1 overflow-x-auto min-w-0">
        {primarios.map((item) => <TabItem key={item.to} {...item} />)}
      </div>

      {noMais.length > 0 && (
        <div className="relative flex-shrink-0" ref={ref}>
          <button
            onClick={() => setAberto((v) => !v)}
            className={`tab-link${algumAtivoNoMais ? ' tab-link-active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <i className="ti ti-dots text-[16px]" aria-hidden="true" />
            Mais
            <i className={`ti ti-chevron-down text-[14px] transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {aberto && (
            <div
              className="absolute right-0 top-full mt-1 py-2 z-50"
              style={{
                background: 'var(--surface)',
                border: '1px solid rgba(var(--ink-rgb), 0.08)',
                borderRadius: '4px',
                boxShadow: '0 8px 24px rgba(var(--ink-rgb), 0.12)',
                minWidth: '220px',
              }}
            >
              {noMais.map((item) => {
                const mudouGrupo = item.grupo !== grupoAtual;
                grupoAtual = item.grupo;
                return (
                  <div key={item.to}>
                    {mudouGrupo && <NavGroup label={item.grupo} />}
                    <div className="px-2">
                      <NavItem {...item} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

// Avatar clicável (topbar desktop) — abre menu com "Alterar foto" e "Sair".
// Upload já chega recortado/redimensionado/comprimido de utils/foto.js;
// aqui só sobe pro backend e reflete no AuthContext na hora.
function AvatarMenu({ usuario, onLogout }) {
  const { atualizarFoto } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fileRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function fecharSeFora(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setAberto(false); }
    document.addEventListener('mousedown', fecharSeFora);
    return () => document.removeEventListener('mousedown', fecharSeFora);
  }, []);

  async function onEscolherArquivo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErro('');
    setEnviando(true);
    try {
      const { base64, tipo } = await processarFotoPerfil(file);
      await api.patch('/usuarios/me/foto', { fotoBase64: base64, tipo });
      atualizarFoto(base64, tipo);
    } catch (err) {
      setErro(err.response?.data?.erro || err.message || 'Erro ao enviar foto.');
    }
    setEnviando(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 transition-opacity"
        style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: enviando ? 0.5 : 1 }}
        title={usuario?.nome}
      >
        <div className="relative flex-shrink-0">
          <Avatar nome={usuario?.nome} fotoBase64={usuario?.fotoBase64} fotoTipo={usuario?.fotoTipo} size={32} />
          {enviando && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <i className="ti ti-loader-2 animate-spin text-[14px]" style={{ color: '#fff' }} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="hidden lg:block min-w-0 text-left">
          <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--text)' }}>{usuario?.nome}</p>
          <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{usuario?.perfil}</p>
        </div>
        <i className={`ti ti-chevron-down text-[13px] flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-1.5 py-1.5 z-50" style={{
          background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '4px',
          boxShadow: '0 8px 24px rgba(var(--ink-rgb), 0.12)', minWidth: '180px',
        }}>
          <button
            onClick={() => { fileRef.current?.click(); setAberto(false); }}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <i className="ti ti-camera text-[15px]" aria-hidden="true" /> Alterar foto
          </button>
          <button
            onClick={() => { setAberto(false); onLogout(); }}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
            style={{ color: 'var(--accent-hover)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb), 0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <i className="ti ti-logout text-[15px]" aria-hidden="true" /> Sair
          </button>
        </div>
      )}

      {erro && (
        <div className="absolute right-0 top-full mt-1.5 px-3 py-2 text-xs z-50" style={{
          background: 'var(--surface)', border: '1px solid rgba(var(--accent-rgb), 0.25)', borderRadius: '4px',
          color: 'var(--accent-hover)', boxShadow: '0 8px 24px rgba(var(--ink-rgb), 0.12)', width: '220px',
        }}>
          {erro}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onEscolherArquivo} />
    </div>
  );
}

// Bottom nav: 3 itens fixos no rodapé mobile (Fase 1 item 6 — cores via token, estrutura igual)
const BOTTOM_ITEMS = [
  { to: '/',       icon: 'home',           label: 'Início',  end: true },
  { to: '/leads',  icon: 'users',          label: 'Leads',   end: false },
  { to: '/visitas',icon: 'calendar-event', label: 'Visitas', end: false },
];

export default function Layout() {
  const { usuario, logout, temPerfil } = useAuth();
  const { modoSolo } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const [tarefasAtrasadas, setTarefasAtrasadas] = useState(0);

  // Badge de tarefas atrasadas — atualiza ao navegar (Fase 4 traz tempo real).
  useEffect(() => {
    if (!usuario || usuario.perfil === 'operador') return;
    api.get('/tarefas/contadores')
      .then((r) => setTarefasAtrasadas(r.data.atrasadas || 0))
      .catch(() => {});
  }, [usuario, location.pathname]);

  function handleLogout() { logout(); navigate('/login'); }

  // Troca de senha obrigatória (1º acesso) bloqueia toda a aplicação.
  if (usuario?.precisaTrocarSenha) return <TrocarSenha />;

  const borderBottom = { borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' };

  const itens = itensNav({ modoSolo, usuario, temPerfil, tarefasAtrasadas });

  // Verifica rota ativa para bottom nav
  function isActive(to, end) {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Topbar desktop (abas horizontais no lugar da sidebar) ── */}
      <header className="hidden md:flex items-center gap-6 px-6 flex-shrink-0" style={{ height: '60px', background: 'var(--surface)', ...borderBottom }}>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img src={logoIcon} alt="" className="w-7 h-7" />
          <div>
            <p className="font-semibold text-sm leading-none tracking-widest" style={{ color: 'var(--text)' }}>NRC</p>
            <p className="text-[9px] mt-0.5 uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Empyrus</p>
          </div>
        </div>

        <TopTabsNav itens={itens} />

        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          {modoSolo && (
            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(var(--accent-rgb), 0.10)', color: 'var(--accent)' }}>
              Solo
            </span>
          )}
          <SinoNotificacoes painelStyle={{ top: 56, right: 100 }} />
          <div className="w-px h-6" style={{ background: 'rgba(var(--ink-rgb), 0.08)' }} />
          <AvatarMenu usuario={usuario} onLogout={handleLogout} />
        </div>
      </header>

      {/* ── Top bar mobile (slim, sem hamburguer) ─────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 h-12"
        style={{ background: 'var(--surface)', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}
      >
        <img src={logoIcon} alt="" className="w-6 h-6 mr-2.5" />
        <span className="font-semibold text-sm tracking-widest" style={{ color: 'var(--text)' }}>NRC</span>
        {modoSolo && (
          <span className="ml-2 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(var(--accent-rgb), 0.10)', color: 'var(--accent)' }}>
            Solo
          </span>
        )}
        <div className="ml-auto">
          <SinoNotificacoes painelStyle={{ top: 52, right: 8 }} />
        </div>
      </div>

      {/* ── Sidebar overlay mobile (aberta via bottom nav "Menu") ── */}
      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMenuAberto(false)}>
          <aside className="w-64 h-full flex flex-col shadow-2xl" style={{ background: 'var(--surface)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 px-4 py-4 mt-12" style={borderBottom}>
              <Avatar nome={usuario?.nome} fotoBase64={usuario?.fotoBase64} fotoTipo={usuario?.fotoTipo} size={32} />
              <div>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{usuario?.nome}</p>
                <p className="text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>{usuario?.perfil}</p>
              </div>
            </div>
            <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
              <SidebarNav itens={itens} onItemClick={() => setMenuAberto(false)} />
            </nav>
            <div className="p-2" style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--accent-hover)', borderRadius: '2px' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb), 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <i className="ti ti-logout text-[18px]" aria-hidden="true" />
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Conteúdo principal ────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom Navigation (mobile only) ──────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid rgba(var(--ink-rgb), 0.06)',
          height: '56px',
        }}
      >
        {BOTTOM_ITEMS.map(({ to, icon, label, end }) => {
          const ativo = isActive(to, end);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors"
              style={{ textDecoration: 'none' }}
            >
              <i
                className={`ti ti-${icon} text-[20px]`}
                style={{ color: ativo ? 'var(--accent-hover)' : 'var(--text-muted)' }}
                aria-hidden="true"
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: ativo ? 'var(--accent-hover)' : 'var(--text-muted)' }}
              >
                {label}
              </span>
            </NavLink>
          );
        })}

        {/* Botão Menu — abre sidebar overlay */}
        <button
          onClick={() => setMenuAberto(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors"
          style={{ background: 'none', border: 'none' }}
        >
          <i
            className="ti ti-menu-2 text-[20px]"
            style={{ color: menuAberto ? 'var(--accent-hover)' : 'var(--text-muted)' }}
            aria-hidden="true"
          />
          <span className="text-[10px] font-medium" style={{ color: menuAberto ? 'var(--accent-hover)' : 'var(--text-muted)' }}>
            Menu
          </span>
        </button>
      </nav>
    </div>
  );
}
