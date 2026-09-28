import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Logo from './Logo';
import Button from './ui/Button';
import { ROLE_LABELS } from '../utils/constants';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const dashboardLink = () => {
    if (!user) return '/connexion';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'agent' || user.role === 'moderateur') return '/agent';
    return '/dashboard';
  };

  const navClass = (path) =>
    `nav-link ${location.pathname === path ? 'nav-link-active' : ''}`;

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/" className={navClass('/')}>Accueil</Link>
          <Link to="/carte" className={navClass('/carte')}>Carte</Link>
          {isAuthenticated && (
            <>
              <Link to="/signaler" className={`${navClass('/signaler')} !text-urgence font-semibold`}>
                Signaler
              </Link>
              <Link to={dashboardLink()} className={navClass(dashboardLink())}>
                Tableau de bord
              </Link>
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="relative p-2.5 rounded-xl text-gray-500 hover:text-securite hover:bg-securite/5 transition-all duration-200 active:scale-95"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-urgence text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold animate-pulse-urgence">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <div className="text-sm text-right px-2 hidden lg:block">
                <p className="font-semibold text-gray-800">{user.name}</p>
                <p className="text-gray-500 text-xs">{ROLE_LABELS[user.role]}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl text-gray-500 hover:text-urgence hover:bg-urgence/5 transition-all duration-200 active:scale-95"
                aria-label="Déconnexion"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <>
              <Button to="/connexion" variant="ghost" size="md">
                Connexion
              </Button>
              <Button to="/inscription" variant="danger" size="md">
                S'inscrire
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-all active:scale-95"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-lg px-4 py-4 space-y-1 animate-slide-down">
          <Link to="/" className="block nav-link py-3" onClick={() => setMenuOpen(false)}>Accueil</Link>
          <Link to="/carte" className="block nav-link py-3" onClick={() => setMenuOpen(false)}>Carte</Link>
          {isAuthenticated ? (
            <>
              <Link to="/signaler" className="block nav-link py-3 !text-urgence font-semibold" onClick={() => setMenuOpen(false)}>
                Signaler
              </Link>
              <Link to={dashboardLink()} className="block nav-link py-3" onClick={() => setMenuOpen(false)}>
                Tableau de bord
              </Link>
              <button
                onClick={handleLogout}
                className="block nav-link py-3 !text-urgence w-full text-left"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Button to="/connexion" variant="outline" size="md" className="w-full" onClick={() => setMenuOpen(false)}>
                Connexion
              </Button>
              <Button to="/inscription" variant="danger" size="md" className="w-full" onClick={() => setMenuOpen(false)}>
                S'inscrire
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
