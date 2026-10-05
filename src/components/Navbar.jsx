import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, X, AlertTriangle, Sun, Moon, Monitor, Languages } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/i18nContext';
import Logo from './Logo';
import Button from './ui/Button';
import { ROLE_LABELS } from '../utils/constants';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useSocket();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const themeIcon = theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <Monitor size={16} />;

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

  const roleColor = {
    admin:      'bg-purple-100 text-purple-700',
    agent:      'bg-blue-100 text-securite',
    moderateur: 'bg-blue-100 text-securite',
    citoyen:    'bg-green-100 text-green-700',
  };

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          <Link to="/" className={navClass('/')}>{t('nav.home')}</Link>
          <Link to="/carte" className={navClass('/carte')}>{t('nav.map')}</Link>
          {isAuthenticated && (
            <>
              <Link
                to="/signaler"
                className={`${navClass('/signaler')} !text-urgence font-semibold flex items-center gap-1.5`}
              >
                <AlertTriangle size={14} />
                {t('nav.report')}
              </Link>
              <Link to={dashboardLink()} className={navClass(dashboardLink())}>
                {t('nav.dashboard')}
              </Link>
            </>
          )}
        </nav>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-gray-500 hover:text-securite hover:bg-securite/5 transition-all text-xs font-bold active:scale-95"
            title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
          >
            <Languages size={15} />
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>

          {/* Theme toggle */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setThemeOpen(!themeOpen)}
              className="p-2.5 rounded-xl text-gray-500 hover:text-securite hover:bg-securite/5 transition-all active:scale-95"
              title={t('nav.theme')}
            >
              {themeIcon}
            </button>
            {themeOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 z-50 min-w-[130px] animate-slide-down">
                {[
                  { value: 'light', icon: <Sun size={14} />, label: t('nav.theme.light') },
                  { value: 'dark',  icon: <Moon size={14} />, label: t('nav.theme.dark') },
                  { value: 'system',icon: <Monitor size={14} />, label: t('nav.theme.system') },
                ].map(({ value, icon, label }) => (
                  <button
                    key={value}
                    onClick={() => { setTheme(value); setThemeOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                      theme === value ? 'bg-securite/10 text-securite font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="relative p-2.5 rounded-xl text-gray-500 hover:text-securite hover:bg-securite/5 transition-all duration-200 active:scale-95"
                aria-label="Notifications"
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-urgence text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold animate-pulse-urgence shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200/80 lg:flex">
                <div className="w-7 h-7 bg-gradient-to-br from-securite to-securite-dark rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800 text-sm leading-tight">{user.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleColor[user.role] || 'bg-gray-100 text-gray-500'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl text-gray-400 hover:text-urgence hover:bg-urgence/5 transition-all duration-200 active:scale-95"
                aria-label={t('nav.logout')}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Button to="/connexion" variant="ghost" size="md">{t('nav.login')}</Button>
              <Button to="/inscription" variant="danger" size="md">{t('nav.register')}</Button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-all active:scale-95 text-gray-600"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/97 backdrop-blur-xl px-4 py-4 space-y-1 animate-slide-down shadow-lg">
          {isAuthenticated && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-securite to-securite-dark rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[user.role] || 'bg-gray-100 text-gray-500'}`}>
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            </div>
          )}

          <Link to="/" className="block nav-link py-3" onClick={() => setMenuOpen(false)}>{t('nav.home')}</Link>
          <Link to="/carte" className="block nav-link py-3" onClick={() => setMenuOpen(false)}>{t('nav.map')}</Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/signaler"
                className="block nav-link py-3 !text-urgence font-semibold flex items-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                <AlertTriangle size={16} />
                {t('nav.report')}
              </Link>
              <Link to={dashboardLink()} className="block nav-link py-3" onClick={() => setMenuOpen(false)}>
                {t('nav.dashboard')}
              </Link>
              {user?.role === 'citoyen' && (
                <Link to="/historique" className="block nav-link py-3" onClick={() => setMenuOpen(false)}>
                  📋 Historique
                </Link>
              )}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:border-gray-300 transition-all"
                >
                  🌐 {lang === 'fr' ? 'EN' : 'FR'}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 nav-link py-2 !text-urgence"
                >
                  <LogOut size={16} />
                  {t('nav.logout')}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Button to="/connexion" variant="outline" size="md" className="w-full" onClick={() => setMenuOpen(false)}>
                {t('nav.login')}
              </Button>
              <Button to="/inscription" variant="danger" size="md" className="w-full" onClick={() => setMenuOpen(false)}>
                {t('nav.register')}
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
