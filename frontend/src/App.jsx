import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  Shield, 
  LayoutDashboard, 
  AlertTriangle, 
  Users, 
  Video, 
  Settings, 
  LogOut,
  User,
  LogIn,
  Home,
  Info,
  PlayCircle,
  Upload,
  CheckCircle,
  ShieldCheck,
  Eye
} from 'lucide-react';
import Login from './components/Login';
import HomePage from './components/HomePage';
import VideoDetection from './components/VideoDetection';
import Dashboard from './components/Dashboard';
import Alerts from './components/Alerts';
import Employees from './components/Employees';
import SettingsPage from './components/Settings';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  // Si admin requis et pas admin, rediriger vers accueil (pas login)
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  return children;
};

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  // Navigation pour admin
  const adminNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alertes' },
    { path: '/employees', icon: Users, label: 'Employes' },
    { path: '/settings', icon: Settings, label: 'Parametres' },
  ];

  // Navigation pour utilisateur public/connecte
  const publicNavItems = [
    { path: '/', icon: Home, label: 'Accueil' },
    { path: '/detect', icon: Video, label: 'Detection video' },
  ];

  let navItems = publicNavItems;
  if (isAdmin()) {
    navItems = adminNavItems;
  }

  const handleLogout = () => {
    logout();
    // Rediriger vers la page d'accueil publique apres deconnexion
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Shield size={32} />
          <span>PPE Safety</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Menu principal</div>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        {user && user.username !== 'guest' ? (
          <>
            <div className="user-card">
              <div className="user-avatar">
                <User size={18} />
              </div>
              <div className="user-info">
                <div className="user-name">{user?.username}</div>
                <div className="user-role">
                  {isAdmin() ? 'Administrateur' : 'Utilisateur'}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={16} />
              Deconnexion
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-item" style={{ marginBottom: '12px' }}>
            <LogIn size={16} />
            <span>Connexion Admin</span>
          </Link>
        )}
      </div>
    </aside>
  );
};

const Layout = ({ children }) => (
  <div className="app-container">
    <Sidebar />
    <main className="main-content">{children}</main>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Page de login - accessible manuellement uniquement */}
          <Route path="/login" element={<Login />} />
          
          {/* Page d'accueil publique - accessible a tous */}
          <Route path="/" element={
            <PublicRoute>
              <Layout><HomePage /></Layout>
            </PublicRoute>
          } />
          
          {/* Detection video publique - accessible a tous */}
          <Route path="/detect" element={
            <PublicRoute>
              <Layout><VideoDetection /></Layout>
            </PublicRoute>
          } />
          
          {/* Routes admin protegees */}
          <Route path="/dashboard" element={
            <ProtectedRoute adminOnly>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/alerts" element={
            <ProtectedRoute adminOnly>
              <Layout><Alerts /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/employees" element={
            <ProtectedRoute adminOnly>
              <Layout><Employees /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute adminOnly>
              <Layout><SettingsPage /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;