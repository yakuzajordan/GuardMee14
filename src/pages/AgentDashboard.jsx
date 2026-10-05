import { useEffect, useState, useCallback, useRef } from 'react';
import { Check, X, MessageSquare, Truck, AlertCircle, Radio, RefreshCw, Filter, Send } from 'lucide-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import IncidentMap from '../components/IncidentMap';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { moderationAPI, incidentAPI, resourceAPI, messageAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/i18nContext';
import { INCIDENT_TYPES, STATUS_LABELS, URGENCY_COLORS, formatDate, CAMEROON_CENTER } from '../utils/constants';

const urgencyConfig = {
  critique: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500', label: 'Critique', icon: '🔴' },
  eleve:    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500', label: 'Élevé', icon: '🟠' },
  moyen:    { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', label: 'Moyen', icon: '🟡' },
  faible:   { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', label: 'Faible', icon: '🟢' },
};

const interventionSteps = [
  { value: 'en_route', labelKey: 'agent.enRoute', icon: '🚗', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'sur_place', labelKey: 'agent.onSite', icon: '📍', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { value: 'terminee', labelKey: 'agent.done', icon: '✅', color: 'text-green-700 bg-green-50 border-green-200' },
];

function AgentDashboardContent() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [pending, setPending] = useState([]);
  const [resources, setResources] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ urgency: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef(null);
  const { liveIncidents, socket } = useSocket();

  useEffect(() => {
    if (!selected?._id || !chatOpen) return;
    const unsub = messageAPI.subscribe(selected._id, (msgs) => {
      setChatMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return () => unsub?.();
  }, [selected?._id, chatOpen]);

  const handleSendChat = async () => {
    if (!chatText.trim() || !selected?._id) return;
    const text = chatText.trim();
    setChatText('');
    await messageAPI.send(selected._id, {
      text,
      senderId: user?._id,
      senderName: user?.name || 'Agent',
      senderRole: user?.role || 'agent',
    });
  };

  useEffect(() => {
    if (!socket) return;
    const onAlerte = (alert) => {
      setLiveAlerts((prev) => [alert, ...prev].slice(0, 10));
    };
    socket.on('alerte_service', onAlerte);
    return () => socket.off('alerte_service', onAlerte);
  }, [socket]);

  const fetchData = useCallback(async () => {
    try {
      const [pendingRes, resourcesRes, incidentsRes] = await Promise.all([
        moderationAPI.pending(filter),
        resourceAPI.list(),
        incidentAPI.list({ status: 'en_cours' }),
      ]);
      setPending(pendingRes.data.incidents);
      setResources(resourcesRes.data.resources);
      setActiveIncidents(incidentsRes.data.incidents);
    } catch {
      // silently fail
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (liveIncidents.length) fetchData(); }, [liveIncidents, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleValidate = async (id) => {
    setActionLoading(true);
    try {
      await moderationAPI.validate(id);
      fetchData();
      setSelected(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(true);
    try {
      await moderationAPI.reject(id, rejectReason);
      fetchData();
      setSelected(null);
      setRejectReason('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async (id) => {
    const message = prompt('Message pour le signaleur:');
    if (!message) return;
    await moderationAPI.requestInfo(id, message);
    fetchData();
  };

  const handleIntervention = async (id, status) => {
    await incidentAPI.updateIntervention(id, { status });
    fetchData();
  };

  const urgCfg = (urgency) => urgencyConfig[urgency] || urgencyConfig.faible;

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('agent.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('agent.subtitle')}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-sm text-securite font-medium px-3 py-2 rounded-xl hover:bg-blue-50 transition-all active:scale-95 border border-blue-200"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {t('common.refresh')}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {[
          { value: pending.length, label: t('agent.pending'), bg: 'from-amber-400 to-orange-500', icon: '⏳', shadow: 'shadow-orange-200' },
          { value: activeIncidents.length, label: t('agent.active'), bg: 'from-urgence to-urgence-dark', icon: '🚨', shadow: 'shadow-red-200' },
          { value: resources.filter((r) => r.status === 'disponible').length, label: t('agent.resources'), bg: 'from-securite to-securite-dark', icon: '🚑', shadow: 'shadow-blue-200' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${s.shadow} animate-fade-in-up bg-gradient-to-br ${s.bg}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-extrabold tracking-tight">{s.value}</p>
                <p className="text-sm text-white/80 mt-1 font-medium leading-tight">{s.label}</p>
              </div>
              <span className="text-3xl opacity-80">{s.icon}</span>
            </div>
            <div className="absolute -bottom-2 -right-2 opacity-10 text-8xl select-none">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* ── Live alerts ── */}
      {liveAlerts.length > 0 && (
        <section className="mb-6 live-alert-bar rounded-2xl p-4 animate-slide-in-left">
          <h2 className="font-bold text-urgence mb-3 flex items-center gap-2 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-urgence opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-urgence" />
            </span>
            <Radio size={15} />
            {t('agent.liveAlerts')} ({liveAlerts.length})
          </h2>
          <div className="space-y-2">
            {liveAlerts.slice(0, 3).map((alert, i) => (
              <div key={i} className="bg-white rounded-xl p-3 text-sm flex items-start justify-between gap-3 shadow-sm border border-red-50 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 flex items-center gap-1.5">
                    {INCIDENT_TYPES[alert.type]?.icon}
                    {INCIDENT_TYPES[alert.type]?.label || alert.type}
                    <span className="ml-1 text-xs bg-urgence text-white px-2 py-0.5 rounded-full capitalize">
                      {alert.gravite}
                    </span>
                  </p>
                  <p className="text-gray-500 mt-1 text-xs leading-relaxed">{alert.description}</p>
                  {alert.routedService && (
                    <p className="text-xs text-securite mt-1 font-medium">
                      → {alert.routedService?.label}
                    </p>
                  )}
                </div>
                {alert.videoUrl && (
                  <a href={alert.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-securite font-medium flex-shrink-0 px-2 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Voir vidéo
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Pending incidents ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2 text-gray-800">
              <AlertCircle size={19} className="text-urgence" />
              {t('agent.pending')}
              {pending.length > 0 && (
                <span className="px-2 py-0.5 bg-urgence text-white text-xs rounded-full font-bold">
                  {pending.length}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-gray-400" />
              <select
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:border-securite outline-none"
                value={filter.urgency}
                onChange={(e) => setFilter({ ...filter, urgency: e.target.value })}
              >
                <option value="">{t('map.allLevels')}</option>
                <option value="critique">🔴 Critique</option>
                <option value="eleve">🟠 Élevé</option>
                <option value="moyen">🟡 Moyen</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {pending.length === 0 ? (
              <div className="text-center py-12 bg-white/80 rounded-2xl border border-gray-200/80">
                <div className="text-4xl mb-3 opacity-30">✅</div>
                <p className="text-gray-400 text-sm font-medium">{t('agent.noPending')}</p>
                <p className="text-gray-300 text-xs mt-1">{t('agent.allTreated')}</p>
              </div>
            ) : pending.map((inc, idx) => {
              const cfg = urgCfg(inc.urgency);
              return (
                <div
                  key={inc._id}
                  onClick={() => setSelected(selected?._id === inc._id ? null : inc)}
                  className={`bg-white border-2 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md animate-fade-in-up ${
                    selected?._id === inc._id ? `${cfg.border} shadow-md` : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">{INCIDENT_TYPES[inc.type]?.icon || '⚠️'}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{INCIDENT_TYPES[inc.type]?.label}</p>
                        <p className="text-xs text-gray-400">{formatDate(inc.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{inc.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-300">{t('agent.credibility')}: {inc.credibilityScore || '—'}%</span>
                    {inc.media?.length > 0 && (
                      <span className="text-xs text-securite flex items-center gap-1">
                        <Camera size={10} /> {inc.media.length} média(s)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action panel */}
          {selected && (
            <div className="mt-4 bg-white border-2 border-securite/30 rounded-2xl p-4 space-y-3 animate-slide-down shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-xl">{INCIDENT_TYPES[selected.type]?.icon}</span>
                  {INCIDENT_TYPES[selected.type]?.label}
                </h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{selected.description}</p>

              {selected.media?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selected.media.map((m, i) => (
                    <img key={i} src={m.url} alt="" className="w-20 h-20 object-cover rounded-xl flex-shrink-0 border border-gray-200" />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleValidate(selected._id)} disabled={actionLoading} variant="success" size="sm" className="flex-1 sm:flex-none">
                  <Check size={15} /> {t('agent.validate')}
                </Button>
                <Button onClick={() => handleRequestInfo(selected._id)} variant="ghost" size="sm" className="flex-1 sm:flex-none border border-warning !text-warning hover:bg-amber-50">
                  <MessageSquare size={15} /> {t('agent.requestInfo')}
                </Button>
                <Button onClick={() => handleReject(selected._id)} disabled={actionLoading} variant="danger" size="sm" className="flex-1 sm:flex-none">
                  <X size={15} /> {t('agent.reject')}
                </Button>
                <button
                  type="button"
                  onClick={() => setChatOpen(!chatOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                    chatOpen ? 'bg-securite text-white border-securite' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <MessageSquare size={13} /> {t('agent.chat')}
                  {chatMessages.length > 0 && <span className="px-1.5 py-0.5 bg-urgence text-white text-[10px] rounded-full">{chatMessages.length}</span>}
                </button>
              </div>

              <input
                type="text"
                placeholder={t('agent.rejectReason')}
                className="input-field text-sm"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />

              {/* Chat panel */}
              {chatOpen && (
                <div className="border border-gray-200 rounded-xl overflow-hidden animate-slide-down">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <MessageSquare size={14} /> {t('agent.messaging')}
                  </div>
                  <div className="h-40 overflow-y-auto p-3 space-y-2 bg-white">
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 pt-4">{t('agent.noMessages')}</p>
                    ) : chatMessages.map((msg) => (
                      <div
                        key={msg._id}
                        className={`flex ${msg.senderId === user?._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${
                          msg.senderId === user?._id
                            ? 'bg-securite text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {msg.senderId !== user?._id && (
                            <p className="font-semibold text-[10px] mb-0.5 opacity-70">{msg.senderName}</p>
                          )}
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2 p-2 border-t border-gray-100 bg-white">
                    <input
                      type="text"
                      className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:border-securite outline-none"
                      placeholder={t('common.typeMessage')}
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    />
                    <button
                      type="button"
                      onClick={handleSendChat}
                      disabled={!chatText.trim()}
                      className="p-2 bg-securite text-white rounded-lg hover:bg-securite-dark disabled:opacity-50 transition-all active:scale-95"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Right column ── */}
        <section className="space-y-5">
          {/* Map */}
          <Card padding={false} className="overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-urgence rounded-full animate-pulse-urgence" />
                {t('agent.alertsMap')}
              </h2>
              <span className="text-xs text-gray-400">{pending.length + activeIncidents.length} incidents</span>
            </div>
            <div className="px-4 pb-4">
              <IncidentMap
                incidents={[...pending, ...activeIncidents]}
                center={CAMEROON_CENTER}
                height="260px"
              />
            </div>
          </Card>

          {/* Resources */}
          <Card>
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Truck size={18} className="text-securite" />
              {t('agent.resources')}
            </h2>
            {resources.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune ressource</p>
            ) : (
              <div className="space-y-2">
                {resources.slice(0, 6).map((r) => (
                  <div key={r._id} className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                    <div>
                      <p className="font-medium text-sm text-gray-800">{r.name}</p>
                      <p className="text-gray-400 text-xs">{r.type}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      r.status === 'disponible' ? 'bg-green-100 text-green-700' :
                      r.status === 'en_mission' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status === 'disponible' ? '✅' : r.status === 'en_mission' ? '🚗' : '⛔'} {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Active interventions */}
          {activeIncidents.length > 0 && (
            <Card>
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-urgence rounded-full animate-pulse-urgence" />
                {t('agent.interventions')}
              </h2>
              <div className="space-y-3">
                {activeIncidents.map((inc) => (
                  <div key={inc._id} className="bg-gray-50/80 border border-gray-100 rounded-xl p-3">
                    <p className="font-semibold text-sm text-gray-800 mb-2">
                      {INCIDENT_TYPES[inc.type]?.icon} {INCIDENT_TYPES[inc.type]?.label}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {interventionSteps.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleIntervention(inc._id, s.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all active:scale-95 ${
                            inc.intervention?.status === s.value ? s.color : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {s.icon} {t(s.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      </div>
    </Layout>
  );
}

// Fix: Camera import missing
function Camera({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

export default function AgentDashboard() {
  return (
    <ProtectedRoute roles={['agent', 'moderateur', 'admin']}>
      <AgentDashboardContent />
    </ProtectedRoute>
  );
}
