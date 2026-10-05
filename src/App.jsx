import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './context/i18nContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifySMSPage from './pages/VerifySMSPage';
import CitizenDashboard from './pages/CitizenDashboard';
import ReportFormPage from './pages/ReportFormPage';
import MapPage from './pages/MapPage';
import AgentDashboard from './pages/AgentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import HistoriquePage from './pages/HistoriquePage';
import { useOfflineSync } from './hooks/useOfflineSync';

function DashboardRouter() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-securite border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/connexion" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'agent' || user.role === 'moderateur') return <Navigate to="/agent" replace />;
  return <CitizenDashboard />;
}

function AppContent() {
  useOfflineSync();
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />
      <Route path="/verification-sms" element={<VerifySMSPage />} />
      <Route path="/dashboard" element={<DashboardRouter />} />
      <Route path="/signaler" element={<ReportFormPage />} />
      <Route path="/carte" element={<MapPage />} />
      <Route path="/agent" element={<AgentDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/historique" element={<HistoriquePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <SocketProvider>
              <AppContent />
            </SocketProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
