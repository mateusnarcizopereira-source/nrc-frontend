import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { NotificacoesProvider } from './contexts/NotificacoesContext';
import Login from './pages/Login';
import Privacidade from './pages/Privacidade';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetalhe from './pages/LeadDetalhe';
import Corretores from './pages/Corretores';
import GodPainel from './pages/GodPainel';
import Relatorios from './pages/Relatorios';
import OperadorFila from './pages/OperadorFila';
import PainelVisitas from './pages/PainelVisitas';
import LeadsDescartados from './pages/LeadsDescartados';
import MotivoDescarte from './pages/MotivoDescarte';
import Clientes from './pages/Clientes';
import ClienteDetalhe from './pages/ClienteDetalhe';
import Campanhas from './pages/Campanhas';
import CampanhaDiscador from './pages/CampanhaDiscador';
import Empreendimentos from './pages/Empreendimentos';
import Tarefas from './pages/Tarefas';
import Agenda from './pages/Agenda';
import Layout from './components/Layout';
import InstallBanner from './components/InstallBanner';

const SEM_LEADS = ['operador'];
// Allow-list dos perfis que acessam Clientes/Campanhas — espelha o backend
// (exigirPerfis('corretor','gerente','editor') em routes/index.js).
const PODE_CLIENTES_CAMPANHAS = ['corretor', 'gerente', 'editor'];
// Allow-list da Fila — espelha o backend (exigirPerfis em /sorteio/fila-viva).
// Antes era perfilMinimo="operador" (hierarquia), que também deixava diretor
// passar; agora é explícito e diretor fica de fora, como pedido.
const PODE_FILA = ['operador', 'corretor', 'gerente', 'editor'];

function Privado({ children, perfilMinimo, perfisPermitidos, bloqueados }) {
  const { usuario, carregando, temPerfil } = useAuth();
  if (carregando) return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (perfilMinimo && !temPerfil(perfilMinimo)) return <Navigate to="/" replace />;
  // Allow-list explícita (nunca blacklist) — usada onde a hierarquia deixaria
  // um perfil "acima" passar indevidamente (ex.: diretor em rota de gerente).
  if (perfisPermitidos && !perfisPermitidos.includes(usuario.perfil)) return <Navigate to="/" replace />;
  if (bloqueados && bloqueados.includes(usuario.perfil)) return <Navigate to="/" replace />;
  return children;
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-nrc-600 border-t-transparent rounded-full animate-spin" />;
}

export default function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <NotificacoesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/" element={<Privado><Layout /></Privado>}>
              <Route index element={<Dashboard />} />
              <Route path="leads" element={<Privado bloqueados={SEM_LEADS}><Leads /></Privado>} />
              <Route path="leads/:id" element={<Privado bloqueados={SEM_LEADS}><LeadDetalhe /></Privado>} />
              <Route path="visitas" element={<Privado perfilMinimo="gerente"><PainelVisitas /></Privado>} />
              <Route path="leads-descartados" element={<Privado perfilMinimo="gerente"><LeadsDescartados /></Privado>} />
              <Route path="operador" element={<Privado perfisPermitidos={PODE_FILA}><OperadorFila /></Privado>} />
              <Route path="motivos-descarte" element={<Privado perfilMinimo="gerente"><MotivoDescarte /></Privado>} />
              <Route path="corretores" element={<Privado perfisPermitidos={['editor']}><Corretores /></Privado>} />
              {/* Leitura liberada pro corretor também (API já não restringia GET por
                  perfil) — edição/materiais continuam só gerente/editor, resolvido
                  dentro de Empreendimentos.jsx (podeEditar). */}
              <Route path="empreendimentos" element={<Privado perfisPermitidos={PODE_CLIENTES_CAMPANHAS}><Empreendimentos /></Privado>} />
              <Route path="tarefas" element={<Privado bloqueados={SEM_LEADS}><Tarefas /></Privado>} />
              <Route path="agenda" element={<Privado perfisPermitidos={PODE_CLIENTES_CAMPANHAS}><Agenda /></Privado>} />
              <Route path="relatorios" element={<Privado perfilMinimo="gerente"><Relatorios /></Privado>} />
              <Route path="god" element={<Privado perfilMinimo="editor"><GodPainel /></Privado>} />
              <Route path="clientes" element={<Privado perfisPermitidos={PODE_CLIENTES_CAMPANHAS}><Clientes /></Privado>} />
              <Route path="clientes/:id" element={<Privado perfisPermitidos={PODE_CLIENTES_CAMPANHAS}><ClienteDetalhe /></Privado>} />
              <Route path="campanhas" element={<Privado perfisPermitidos={PODE_CLIENTES_CAMPANHAS}><Campanhas /></Privado>} />
              <Route path="campanhas/:id/discador" element={<Privado perfisPermitidos={PODE_CLIENTES_CAMPANHAS}><CampanhaDiscador /></Privado>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <InstallBanner />
        </BrowserRouter>
        </NotificacoesProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}
