import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Map, Bell, Plus, ChevronRight, TrendingUp, Clock, CheckCircle, Zap, History, ShieldCheck } from 'lucide-react';
import Layout from '../components/Layout';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { incidentAPI } from '../services/api';
import { INCIDENT_TYPES, STATUS_LABELS, formatDate, CAMEROON_CENTER } from '../utils/constants';
import { useI18n } from '../context/i18nContext';

const statusConfig = {
  valide:   { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', icon: '✅' },
  rejete:   { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500',   icon: '❌' },
  en_cours: { bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-500',  icon: '🔄' },
  en_attente:{ bg: 'bg-yellow-100',text:'text-yellow-700', dot: 'bg-yellow-500',icon: '⏳' },
};

const ASSISTANCE = {
  agression:        { steps: ['Éloignez-vous du danger', 'Appelez la Police : 17', 'Ne confrontez pas les suspects', 'Mémorisez la description'], color: 'bg-red-50 border-red-200 text-red-800' },
  accident:         { steps: ['Sécurisez la zone', 'Appelez le SAMU : 15 ou les Pompiers : 18', 'Ne déplacez pas les blessés', 'Signalez aux autres conducteurs'], color: 'bg-orange-50 border-orange-200 text-orange-800' },
  incendie:         { steps: ['Évacuez immédiatement', 'Appelez les Pompiers : 18', 'Ne prenez pas l\'ascenseur', 'Signalez les personnes piégées'], color: 'bg-red-50 border-red-200 text-red-800' },
  inondation:       { steps: ['Montez aux étages supérieurs', 'N\'entrez pas dans l\'eau courante', 'Appelez le 18', 'Coupez l\'électricité si possible'], color: 'bg-blue-50 border-blue-200 text-blue-800' },
  coupure:          { steps: ['Évitez les câbles à terre', 'Appelez votre fournisseur d\'énergie', 'Signalez les fuites de gaz au 18', 'Utilisez des lampes de secours'], color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  vol:              { steps: ['Ne tentez pas d\'intervenir', 'Appelez la Police : 17', 'Mémorisez les détails', 'Conservez les preuves'], color: 'bg-purple-50 border-purple-200 text-purple-800' },
  danger_sanitaire: { steps: ['Éloignez-vous de la zone', 'N\'ingérez rien de suspect', 'Appelez le SAMU : 15', 'Lavez-vous les mains abondamment'], color: 'bg-green-50 border-green-200 text-green-800' },
};

function DashboardContent() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead } = useSocket();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [myIncidents, setMyIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urgenceLoading, setUrgenceLoading] = useState(false);
  const [showAssistance, setShowAssistance] = useState(false);
  const [selectedAssist, setSelectedAssist] = useState(null);

  useEffect(() => {
    incidentAPI.mine()
      .then((res) => setMyIncidents(res.data.incidents))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resolvedCount = myIncidents.filter((i) => i.status === 'valide' || i.status === 'resolu').length;
  const pendingCount = myIncidents.filter((i) => i.status === 'en_attente' || i.status === 'en_cours').length;

  const lastIncidentType = myIncidents[0]?.type;
  const assistanceInfo = ASSISTANCE[lastIncidentType] || null;

  const handleUrgence = useCallback(async () => {
    setUrgenceLoading(true);
    try {
      const getPos = () => new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (p) => resolve([p.coords.latitude, p.coords.longitude]),
          () => resolve(CAMEROON_CENTER),
          { enableHighAccuracy: true, timeout: 5000 }
        )
      );
      const position = await getPos();
      const formData = new FormData();
      formData.append('type', 'agression');
      formData.append('description', '🆘 URGENCE — Signalement express via le bouton urgence');
      formData.append('latitude', position[0]);
      formData.append('longitude', position[1]);
      formData.append('isAnonymous', false);
      await incidentAPI.create(formData);
      const res = await incidentAPI.mine();
      setMyIncidents(res.data.incidents);
      alert('🆘 Urgence signalée ! Les agents ont été alertés.');
    } catch {
      alert('Erreur lors du signalement d\'urgence. Essayez /signaler');
    } finally {
      setUrgenceLoading(false);
    }
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('citizen.greeting.morning');
    if (h < 18) return t('citizen.greeting.afternoon');
    return t('citizen.greeting.evening');
  };

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="mb-6 sm:mb-8 animate-fade-in-up">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-0.5">{getGreeting()},</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-800">
              {user.name} <span className="text-2xl">👋</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">{t('citizen.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {t('common.online')}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <Link
          to="/signaler"
          className="relative overflow-hidden stat-card bg-gradient-to-br from-urgence to-urgence-dark text-white flex items-center gap-3 shadow-lg shadow-urgence/30 hover:shadow-xl hover:shadow-urgence/35 active:scale-[0.98] transition-all animate-fade-in-up delay-100 glow-urgence group"
        >
          <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="font-bold text-base">{t('citizen.report')}</p>
            <p className="text-xs text-red-100">{t('citizen.reportSub')}</p>
          </div>
        </Link>

        {/* Bouton urgence rapide */}
        <button
          type="button"
          onClick={handleUrgence}
          disabled={urgenceLoading}
          className="relative overflow-hidden stat-card bg-gradient-to-br from-red-700 to-red-900 text-white flex items-center gap-3 shadow-lg shadow-red-900/40 hover:shadow-xl active:scale-[0.98] transition-all animate-fade-in-up delay-150 group disabled:opacity-70"
        >
          <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
            {urgenceLoading ? (
              <div className="w-[22px] h-[22px] border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap size={22} />
            )}
          </div>
          <div>
            <p className="font-bold text-base">🆘 Urgence</p>
            <p className="text-xs text-red-200">{t('citizen.urgencySub')}</p>
          </div>
          <span className="absolute top-1 right-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          </span>
        </button>

        <Link
          to="/carte"
          className="relative overflow-hidden stat-card bg-gradient-to-br from-securite to-securite-dark text-white flex items-center gap-3 shadow-lg shadow-securite/25 hover:shadow-xl hover:shadow-securite/35 active:scale-[0.98] transition-all animate-fade-in-up delay-200 glow-securite group"
        >
          <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
            <Map size={22} />
          </div>
          <div>
            <p className="font-bold text-base">{t('citizen.livemap')}</p>
            <p className="text-xs text-blue-100">{t('citizen.livemapSub')}</p>
          </div>
        </Link>

        <div className="relative overflow-hidden stat-card bg-white border border-gray-200/80 flex items-center gap-3 shadow-sm animate-fade-in-up delay-300">
          <div className="p-2 bg-amber-50 rounded-xl">
            <Bell size={22} className="text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-2xl text-gray-800">{unreadCount}</p>
            <p className="text-xs text-gray-500">{t('citizen.notifications')}</p>
          </div>
          {unreadCount > 0 && (
            <span className="w-2 h-2 bg-urgence rounded-full animate-pulse-urgence flex-shrink-0" />
          )}
        </div>
      </div>

      {/* ── Mini stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-in-up delay-300">
        {[
          { icon: TrendingUp, label: t('citizen.total'), value: myIncidents.length, color: 'text-securite', bg: 'bg-blue-50' },
          { icon: CheckCircle, label: t('citizen.resolved'), value: resolvedCount, color: 'text-success', bg: 'bg-green-50' },
          { icon: Clock, label: t('citizen.inProgress'), value: pendingCount, color: 'text-warning', bg: 'bg-amber-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-4 text-center shadow-sm">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-xl font-bold text-gray-800">{loading ? '—' : value}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Assistance panel ── */}
      {assistanceInfo && (
        <div className="mb-6 animate-fade-in-up delay-350">
          <button
            type="button"
            onClick={() => setShowAssistance(!showAssistance)}
            className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all active:scale-[0.99] ${
              showAssistance
                ? 'bg-securite/5 border-securite/30 text-securite'
                : 'bg-white border-gray-200/80 text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${showAssistance ? 'bg-securite/10' : 'bg-gray-100'}`}>
                <ShieldCheck size={18} className={showAssistance ? 'text-securite' : 'text-gray-500'} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">{t('citizen.assistance')}</p>
                <p className="text-xs text-gray-400">{INCIDENT_TYPES[lastIncidentType]?.icon} {INCIDENT_TYPES[lastIncidentType]?.label}</p>
              </div>
            </div>
            <ChevronRight size={16} className={`transition-transform ${showAssistance ? 'rotate-90' : ''}`} />
          </button>

          {showAssistance && (
            <div className={`mt-2 p-4 rounded-2xl border ${assistanceInfo.color} animate-slide-down`}>
              <p className="font-semibold text-sm mb-3 flex items-center gap-2">
                <ShieldCheck size={15} />
                {t('citizen.assistance')}
              </p>
              <ol className="space-y-2">
                {assistanceInfo.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-4 pt-3 border-t border-current/20 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <a href="tel:17" className="p-2 bg-current/10 rounded-xl hover:bg-current/20 transition-colors">🚔 17</a>
                <a href="tel:18" className="p-2 bg-current/10 rounded-xl hover:bg-current/20 transition-colors">🚒 18</a>
                <a href="tel:15" className="p-2 bg-current/10 rounded-xl hover:bg-current/20 transition-colors">🚑 15</a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main content ── */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Incidents */}
        <Card className="animate-fade-in-up delay-400">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-urgence rounded-full" />
              {t('citizen.myReports')}
            </h2>
            <Link
              to="/signaler"
              className="flex items-center gap-1 text-urgence text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 active:scale-95 transition-all"
            >
              <Plus size={14} />
              {t('common.new')}
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 skeleton rounded-xl" />
              ))}
            </div>
          ) : myIncidents.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3 opacity-40">📋</div>
              <p className="text-gray-400 text-sm font-medium">{t('citizen.noReports')}</p>
              <Link
                to="/signaler"
                className="inline-flex items-center gap-1.5 mt-4 text-sm text-urgence font-semibold hover:underline"
              >
                {t('citizen.firstReport')} <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {myIncidents.slice(0, 5).map((inc, i) => {
                const cfg = statusConfig[inc.status] || statusConfig.en_attente;
                return (
                  <div
                    key={inc._id}
                    className="flex items-center gap-3 p-3.5 bg-gray-50/80 rounded-xl hover:bg-gray-100/80 transition-colors active:scale-[0.99] group animate-fade-in-up"
                    style={{ animationDelay: `${400 + i * 60}ms` }}
                  >
                    <span className="text-xl flex-shrink-0">{INCIDENT_TYPES[inc.type]?.icon || '⚠️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{INCIDENT_TYPES[inc.type]?.label}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {formatDate(inc.createdAt)}
                      </p>
                    </div>
                    <span className={`badge text-xs ${cfg.bg} ${cfg.text} gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {STATUS_LABELS[inc.status] || inc.status}
                    </span>
                  </div>
                );
              })}
              <Link
                to="/historique"
                className="flex items-center justify-center gap-2 w-full pt-3 mt-1 border-t border-gray-100 text-sm text-securite font-semibold hover:text-securite-dark transition-colors"
              >
                <History size={14} />
                {t('citizen.history')}
                <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card className="animate-fade-in-up delay-500">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-warning rounded-full" />
              {t('citizen.notifications')}
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-urgence text-white text-xs rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3 opacity-40">🔔</div>
              <p className="text-gray-400 text-sm">{t('citizen.noNotifs')}</p>
              <p className="text-gray-300 text-xs mt-1">{t('citizen.notifsAlert')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notifications.slice(0, 10).map((n, i) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => !n.isRead && markRead(n._id)}
                  className={`w-full text-left p-3.5 rounded-xl flex items-start gap-3 transition-all active:scale-[0.99] animate-fade-in-up group ${
                    !n.isRead ? 'bg-blue-50 hover:bg-blue-100/80 border border-blue-100' : 'bg-gray-50 hover:bg-gray-100/80'
                  }`}
                  style={{ animationDelay: `${500 + i * 50}ms` }}
                >
                  <div className={`w-2 h-2 mt-1.5 flex-shrink-0 rounded-full ${!n.isRead ? 'bg-urgence animate-pulse-urgence' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Profile card ── */}
      <Card className="mt-4 sm:mt-6 animate-fade-in-up delay-600">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-securite rounded-full" />
            {t('citizen.profile')}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-securite to-securite-dark rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Email', value: user.email || '—', icon: '✉️' },
            { label: t('auth.register.phone'), value: user.phone ? `+237 ${user.phone}` : '—', icon: '📱' },
            { label: t('citizen.credibility'), value: null, icon: '⭐', credibility: user.credibilityScore },
            { label: t('citizen.phoneVerified'), value: user.isPhoneVerified ? '✅ ' + t('citizen.phoneVerified') : '❌ Non vérifié', icon: '', verified: user.isPhoneVerified },
          ].map(({ label, value, icon, credibility, verified }) => (
            <div key={label} className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-xs mb-1 flex items-center gap-1">
                <span>{icon}</span> {label}
              </span>
              {credibility !== undefined ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-800">{credibility}/100</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${credibility >= 70 ? 'bg-success' : credibility >= 40 ? 'bg-warning' : 'bg-urgence'}`}
                      style={{ width: `${credibility}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className={`font-medium ${verified === false ? 'text-urgence' : 'text-gray-800'}`}>{value}</span>
              )}
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
