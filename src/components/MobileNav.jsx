import { Link, useLocation } from 'react-router-dom';
import { Home, Map, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileNav() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return null;

  const dashboardPath = user?.role === 'admin' ? '/admin'
    : ['agent', 'moderateur'].includes(user?.role) ? '/agent' : '/dashboard';

  const links = [
    { to: dashboardPath, icon: Home, label: 'Accueil' },
    { to: '/carte', icon: Map, label: 'Carte' },
    { to: '/signaler', icon: AlertTriangle, label: 'Signaler', highlight: true },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Profil' },
  ];

  return (
    <nav className="mobile-nav-bar md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="flex justify-around items-end px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {links.map(({ to, icon: Icon, label, highlight }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`mobile-nav-item ${active && !highlight ? 'mobile-nav-item-active' : ''}`}
            >
              {highlight ? (
                <div className="mobile-nav-fab">
                  <Icon size={24} strokeWidth={2.5} />
                </div>
              ) : (
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              )}
              <span className={highlight ? 'font-semibold text-urgence mt-1' : ''}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
