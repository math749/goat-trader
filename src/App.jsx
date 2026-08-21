import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TradeProvider } from './contexts/TradeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PlatformLayout from './layouts/PlatformLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Termos from './pages/Termos';
import Obrigado from './pages/Obrigado';
import NotFound from './pages/NotFound';

// Private Pages (App)
import DashboardHome from './pages/DashboardHome';
import Abertura from './pages/Abertura';
import Evolucao from './pages/Evolucao';
import Diario from './pages/Diario';
import Historico from './pages/Historico';
import RaioX from './pages/RaioX';
import Laboratorio from './pages/Laboratorio';
import GoatIA from './pages/GoatIA';
import Plano from './pages/Plano';
import Rotina from './pages/Rotina';
import CalculadoraRisco from './pages/CalculadoraRisco';
import Correlacao from './pages/Correlacao';
import Carteiras from './pages/Carteiras';
import Tearsheet from './pages/Tearsheet';
import QuantRadar from './pages/QuantRadar';
import Noticias from './pages/Noticias';
import ImpostoRenda from './pages/ImpostoRenda';
import Psicologia from './pages/Psicologia';
import Admin from './pages/Admin';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TradeProvider>
          <BrowserRouter>
            <Routes>
              {/* Marketing / Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/termos" element={<Termos />} />
              <Route path="/obrigado" element={<Obrigado />} />

              {/* Protected App Routes */}
              <Route path="/app" element={<ProtectedRoute />}>
                <Route element={<PlatformLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="abertura" element={<Abertura />} />
                  <Route path="calculadora" element={<CalculadoraRisco />} />
                  <Route path="evolucao" element={<Evolucao />} />
                  <Route path="correlacao" element={<Correlacao />} />
                  <Route path="diario" element={<Diario />} />
                  <Route path="historico" element={<Historico />} />
                  <Route path="carteiras" element={<Carteiras />} />
                  <Route path="raiox" element={<RaioX />} />
                  <Route path="laboratorio" element={<Laboratorio />} />
                  <Route path="goatia" element={<GoatIA />} />
                  <Route path="plano" element={<Plano />} />
                  <Route path="rotina" element={<Rotina />} />
                  <Route path="tearsheet" element={<Tearsheet />} />
                  <Route path="quant" element={<QuantRadar />} />
                  <Route path="noticias" element={<Noticias />} />
                  <Route path="imposto" element={<ImpostoRenda />} />
                  <Route path="psicologia" element={<Psicologia />} />
                  <Route path="admin" element={<Admin />} />
                </Route>
              </Route>

              {/* Fallback 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TradeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
