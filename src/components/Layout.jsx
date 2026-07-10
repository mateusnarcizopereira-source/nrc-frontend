import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useState } from 'react';
import logoIcon from '../assets/logo-nrc-icon.svg';

function NavItem({ to, icon, label, end = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
      style={{ minHeight: '44px' }}
    >
      <i className={`ti ti-${icon} text-[18px] flex-shrink-0`} aria-hidden="true" />
      {label}
    </NavLink>
  );
}

function NavGroup({ label }) {
  return (
    <p className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
      style={{ color: '#2A2A32' }}>
      {label}
    </p>
  );
}

function SidebarNav({ modoSolo, usuario, temPerfil, onItemClick }) {
  return (
    <>
      <NavItem to="/" icon="layout-dashboard" label="Dashboard" end onClick={onItemClick} />

      {usuario?.perfil !== 'operador' && (
        <NavItem to="/leads" icon="users" label="Leads" onClick={onItemClick} />
      )}

      {!modoSolo && ['operador', 'gerente'].includes(usuario?.perfil) && (
        <NavItem to="/operador" icon="arrows-sort" label="Fila de Distribuição" onClick={onItemClick} />
      )}

      {temPerfil('gerente') && (
        <>
          <NavGroup label="Gestão" />
          <NavItem to="/visitas" icon="calendar-event" label="Visitas" onClick={onItemClick} />
          <NavItem to="/leads-descartados" icon="ban" label="Não Clientes" onClick={onItemClick} />
          <NavItem to="/corretores" icon="user-check" label="Corretores" onClick={onItemClick} />
          <NavItem to="/relatorios" icon="chart-bar" label="Relatórios" onClick={onItemClick} />
          <NavItem to="/motivos-descarte" icon="adjustments-horizontal" label="Motivos Descarte" onClick={onItemClick} />
        </>
      )}

      <NavGroup label="Carteira" />
      <NavItem to="/clientes" icon="address-book" label="Clientes" onClick={onItemClick} />
      <NavItem to="/campanhas" icon="speakerphone" label="Oferta Ativa" onClick={onItemClick} />

      {temPerfil('editor') && (
        <>
          <NavGroup label="Sistema" />
          <NavItem to="/god" icon="settings" label="GOD Painel" onClick={onItemClick} />
        </>
      )}
    </>
  );
}

// Bottom nav: 4 itens fixos no rodapé mobile
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

  function handleLogout() { logout(); navigate('/login'); }

  const iniciais = usuario?.nome
    ?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?';

  const sidebarBg  = { background: '#0D0D0F', borderRight: '1px solid rgba(244,244,248,0.06)' };
  const borderTop  = { borderTop: '1px solid rgba(244,244,248,0.06)' };
  const borderBottom = { borderBottom: '1px solid rgba(244,244,248,0.06)' };

  // Verifica rota ativa para bottom nav
  function isActive(to, end) {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#08080A' }}>

      {/* ── Sidebar desktop ───────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0" style={sidebarBg}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4" style={borderBottom}>
          <img src={logoIcon} alt="" className="w-8 h-8 flex-shrink-0" />
          <div>
            <p className="font-black text-base leading-none tracking-widest" style={{ color: '#F4F4F8' }}>NRC</p>
            <p className="text-[10px] mt-0.5 uppercase tracking-widest" style={{ color: '#2A2A32' }}>
              Serviço para Empyrus
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
          <SidebarNav modoSolo={modoSolo} usuario={usuario} temPerfil={temPerfil} />
        </nav>

        {/* Usuário */}
        <div className="px-2 py-3" style={borderTop}>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(192,57,43,0.15)' }}>
              <span className="font-bold text-xs" style={{ color: '#E74C3C' }}>{iniciais}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight" style={{ color: '#F4F4F8' }}>
                {usuario?.nome}
              </p>
              <p className="text-[11px] capitalize" style={{ color: '#3A3A42' }}>{usuario?.perfil}</p>
            </div>
            <button onClick={handleLogout} className="p-1 transition-colors" style={{ color: '#3A3A42' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E74C3C')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#3A3A42')}
              title="Sair">
              <i className="ti ti-logout text-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Top bar mobile (slim, sem hamburguer) ─────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 h-12"
        style={{ background: '#0D0D0F', borderBottom: '1px solid rgba(244,244,248,0.06)' }}
      >
        <img src={logoIcon} alt="" className="w-6 h-6 mr-2.5" />
        <span className="font-black text-sm tracking-widest" style={{ color: '#F4F4F8' }}>NRC</span>
        {modoSolo && (
          <span className="ml-2 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(192,57,43,0.12)', color: '#C0392B' }}>
            Solo
          </span>
        )}
      </div>

      {/* ── Sidebar overlay mobile (aberta via bottom nav "Menu") ── */}
      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setMenuAberto(false)}>
          <aside className="w-64 h-full flex flex-col shadow-2xl" style={{ background: '#0D0D0F' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 px-4 py-4 mt-12" style={borderBottom}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(192,57,43,0.15)' }}>
                <span className="font-bold text-xs" style={{ color: '#E74C3C' }}>{iniciais}</span>
              </div>
              <div>
                <p className="text-sm font-semibold truncate" style={{ color: '#F4F4F8' }}>{usuario?.nome}</p>
                <p className="text-[11px] capitalize" style={{ color: '#3A3A42' }}>{usuario?.perfil}</p>
              </div>
            </div>
            <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
              <SidebarNav
                modoSolo={modoSolo}
                usuario={usuario}
                temPerfil={temPerfil}
                onItemClick={() => setMenuAberto(false)}
              />
            </nav>
            <div className="p-2" style={borderTop}>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
                style={{ color: '#E74C3C', borderRadius: '2px' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(192,57,43,0.1)')}
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
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom Navigation (mobile only) ──────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center"
        style={{
          background: '#0D0D0F',
          borderTop: '1px solid rgba(244,244,248,0.06)',
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
                style={{ color: ativo ? '#E74C3C' : '#3A3A42' }}
                aria-hidden="true"
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: ativo ? '#E74C3C' : '#3A3A42' }}
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
            style={{ color: menuAberto ? '#E74C3C' : '#3A3A42' }}
            aria-hidden="true"
          />
          <span className="text-[10px] font-medium" style={{ color: menuAberto ? '#E74C3C' : '#3A3A42' }}>
            Menu
          </span>
        </button>
      </nav>
    </div>
  );
}
