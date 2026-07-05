import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
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
import Layout from './components/Layout';

const SEM_LEADS = ['operador'];

function Privado({ children, perfilMinimo, bloqueados }) {
  const { usuario, carregando, temPerfil } = useAuth();
  if (carregando) return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (perfilMinimo && !temPerfil(perfilMinimo)) return <Navigate to="/" replace />;
  if (bloqueados && bloqueados.includes(usuario.perfil)) return <Navigate to="/" replace />;
  return children;
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-nrc-600 border-t-transparent rounded-full animate-spin" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Privado><Layout /></Privado>}>
            <Route index element={<Dashboard />} />

            {/* Leads: bloqueado apenas para operador; gerente pode ler (T1) */}
            <Route path="leads" element={<Privado bloqueados={SEM_LEADS}><Leads /></Privado>} />
            <Route path="leads/:id" element={<Privado bloqueados={SEM_LEADS}><LeadDetalhe /></Privado>} />

            {/* T3 — Visitas: gerente+ */}
            <Route path="visitas" element={<Privado perfilMinimo="gerente"><PainelVisitas /></Privado>} />

            {/* T4 — Leads descartados: gerente+ */}
            <Route path="leads-descartados" element={<Privado perfilMinimo="gerente"><LeadsDescartados /></Privado>} />

            {/* Painel de fila: operador+ */}
            <Route path="operador" element={<Privado perfilMinimo="operador"><OperadorFila /></Privado>} />

            {/* Motivos de descarte configuráveis: gerente+ */}
            <Route path="motivos-descarte" element={<Privado perfilMinimo="gerente"><MotivoDescarte /></Privado>} />

            <Route path="corretores" element={<Privado perfilMinimo="gerente"><Corretores /></Privado>} />
            <Route path="relatorios" element={<Privado perfilMinimo="gerente"><Relatorios /></Privado>} />
            <Route path="god" element={<Privado perfilMinimo="editor"><GodPainel /></Privado>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
