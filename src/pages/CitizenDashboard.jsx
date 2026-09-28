import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Map, Bell } from 'lucide-react';
import Layout from '../components/Layout';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { incidentAPI } from '../services/api';
import { INCIDENT_TYPES, STATUS_LABELS, formatDate } from '../utils/constants';

function DashboardContent() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead } = useSocket();
  const [myIncidents, setMyIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    incidentAPI.mine()
      .then((res) => setMyIncidents(res.data.incidents))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Bonjour, {user.name} 👋
        </h1>
        <p className="text-gray-500 mt-1">Tableau de bord citoyen</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <Link
          to="/signaler"
          className="stat-card bg-gradient-to-br from-urgence to-urgence-dark text-white flex items-center gap-4 shadow-lg shadow-urgence/25 hover:shadow-xl hover:shadow-urgence/30 active:scale-[0.98] transition-all"
        >
          <div className="p-2.5 bg-white/20 rounded-xl">
            <AlertTriangle size={26} />
          </div>
          <div>
            <p className="font-bold text-lg">Signaler</p>
            <p className="text-sm text-red-100">Nouvel incident</p>
          </div>
        </Link>
        <Link
          to="/carte"
          className="stat-card bg-gradient-to-br from-securite to-securite-dark text-white flex items-center gap-4 shadow-lg shadow-securite/25 hover:shadow-xl active:scale-[0.98] transition-all"
        >
          <div className="p-2.5 bg-white/20 rounded-xl">
            <Map size={26} />
          </div>
          <div>
            <p className="font-bold text-lg">Carte</p>
            <p className="text-sm text-blue-100">Zones à risque</p>
          </div>
        </Link>
        <Card className="flex items-center gap-4 !p-5">
          <div className="p-2.5 bg-amber-50 rounded-xl">
            <Bell size={26} className="text-warning" />
          </div>
          <div>
            <p className="font-bold text-2xl">{unreadCount}</p>
            <p className="text-sm text-gray-500">Notifications</p>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <h2 className="font-bold text-lg mb-4 flex items-center justify-between">
            Mes signalements
            <Link
              to="/signaler"
              className="text-securite text-sm font-semibold px-3 py-1 rounded-lg hover:bg-securite/5 active:scale-95 transition-all"
            >
              + Nouveau
            </Link>
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 skeleton rounded-xl" />
              ))}
            </div>
          ) : myIncidents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aucun signalement pour le moment</p>
          ) : (
            <div className="space-y-2">
              {myIncidents.slice(0, 5).map((inc) => (
                <div
                  key={inc._id}
                  className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl hover:bg-gray-100/80 transition-colors active:scale-[0.99]"
                >
                  <span className="text-xl">{INCIDENT_TYPES[inc.type]?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{INCIDENT_TYPES[inc.type]?.label}</p>
                    <p className="text-xs text-gray-500">{formatDate(inc.createdAt)}</p>
                  </div>
                  <span className={`badge text-xs ${inc.status === 'valide' ? 'bg-green-100 text-green-700' :
                      inc.status === 'rejete' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                    }`}>
                    {STATUS_LABELS[inc.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-bold text-lg mb-4">Notifications récentes</h2>
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aucune notification</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 8).map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => !n.isRead && markRead(n._id)}
                  className={`w-full text-left p-3 rounded-xl flex items-start gap-2 transition-all active:scale-[0.99] ${!n.isRead ? 'bg-blue-50 hover:bg-blue-100/80' : 'bg-gray-50 hover:bg-gray-100/80'
                    }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2.5 h-2.5 bg-urgence rounded-full mt-1.5 flex-shrink-0 animate-pulse-urgence" />
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 sm:mt-6">
        <h2 className="font-bold text-lg mb-4">Mon profil</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            ['Email', user.email || '—'],
            ['Téléphone', user.phone || '—'],
            ['Score crédibilité', `${user.credibilityScore}/100`],
            ['Téléphone vérifié', user.isPhoneVerified ? '✅' : '❌'],
          ].map(([label, value]) => (
            <div key={label} className="p-3 bg-gray-50/80 rounded-xl">
              <span className="text-gray-500 block text-xs mb-0.5">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </Layout>
  );
}

export default function CitizenDashboard() {
  return <DashboardContent />;
}
