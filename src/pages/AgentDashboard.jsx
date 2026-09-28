import { useEffect, useState, useCallback } from 'react';
import { Check, X, MessageSquare, Truck, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import IncidentMap from '../components/IncidentMap';
import Button from '../components/ui/Button';
import { moderationAPI, incidentAPI, resourceAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { INCIDENT_TYPES, STATUS_LABELS, URGENCY_COLORS, formatDate, CAMEROON_CENTER } from '../utils/constants';

function AgentDashboardContent() {
  const [pending, setPending] = useState([]);
  const [resources, setResources] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ urgency: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [liveAlerts, setLiveAlerts] = useState([]);
  const { liveIncidents, socket } = useSocket();

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (liveIncidents.length) fetchData();
  }, [liveIncidents, fetchData]);

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

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Espace Agent / Modérateur</h1>
        <p className="text-gray-500">Modération et coordination des interventions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="stat-card bg-yellow-50 border border-yellow-200/80 rounded-2xl p-4 sm:p-5 text-center shadow-sm">
          <p className="text-3xl sm:text-4xl font-bold text-yellow-700">{pending.length}</p>
          <p className="text-sm text-yellow-600 font-medium mt-1">En attente</p>
        </div>
        <div className="stat-card bg-red-50 border border-red-200/80 rounded-2xl p-4 sm:p-5 text-center shadow-sm">
          <p className="text-3xl sm:text-4xl font-bold text-urgence">{activeIncidents.length}</p>
          <p className="text-sm text-red-600 font-medium mt-1">Interventions actives</p>
        </div>
        <div className="stat-card bg-blue-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 text-center shadow-sm">
          <p className="text-3xl sm:text-4xl font-bold text-securite">{resources.filter((r) => r.status === 'disponible').length}</p>
          <p className="text-sm text-blue-600 font-medium mt-1">Ressources disponibles</p>
        </div>
      </div>

      {liveAlerts.length > 0 && (
        <section className="mb-6 bg-urgence/10 border border-urgence/30 rounded-xl p-4">
          <h2 className="font-bold text-urgence mb-3 flex items-center gap-2">
            <span className="animate-pulse-urgence">🔴</span> Alertes live récentes
          </h2>
          <div className="space-y-2">
            {liveAlerts.map((alert, i) => (
              <div key={i} className="bg-white rounded-lg p-3 text-sm flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">
                    {INCIDENT_TYPES[alert.type]?.icon} {INCIDENT_TYPES[alert.type]?.label || alert.type}
                    <span className="ml-2 text-xs bg-urgence text-white px-2 py-0.5 rounded-full capitalize">
                      {alert.gravite}
                    </span>
                  </p>
                  <p className="text-gray-600 mt-1">{alert.description}</p>
                  <p className="text-xs text-securite mt-1">
                    → Routé vers : <strong>{alert.routedService?.label}</strong>
                  </p>
                </div>
                {alert.videoUrl && (
                  <a
                    href={alert.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-securite underline flex-shrink-0"
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
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <AlertCircle size={20} className="text-urgence" /> Signalements en attente
            </h2>
            <select
              className="text-sm border rounded-lg px-2 py-1"
              value={filter.urgency}
              onChange={(e) => setFilter({ ...filter, urgency: e.target.value })}
            >
              <option value="">Toutes urgences</option>
              <option value="critique">Critique</option>
              <option value="eleve">Élevé</option>
              <option value="moyen">Moyen</option>
            </select>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Aucun signalement en attente</p>
            ) : pending.map((inc) => (
              <div
                key={inc._id}
                onClick={() => setSelected(inc)}
                className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition ${
                  selected?._id === inc._id ? 'ring-2 ring-securite' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-lg">{INCIDENT_TYPES[inc.type]?.icon}</span>
                    <span className="font-medium ml-2">{INCIDENT_TYPES[inc.type]?.label}</span>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full text-white"
                    style={{ background: URGENCY_COLORS[inc.urgency] }}
                  >
                    {inc.urgency}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{inc.description}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>{formatDate(inc.createdAt)}</span>
                  <span>Crédibilité: {inc.credibilityScore}%</span>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="mt-4 bg-white border rounded-xl p-4 space-y-3">
              <h3 className="font-bold">Actions — {INCIDENT_TYPES[selected.type]?.label}</h3>
              <p className="text-sm text-gray-600">{selected.description}</p>
              {selected.media?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {selected.media.map((m, i) => (
                    <img key={i} src={m.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleValidate(selected._id)}
                  disabled={actionLoading}
                  variant="success"
                  size="sm"
                >
                  <Check size={16} /> Valider
                </Button>
                <Button
                  onClick={() => handleRequestInfo(selected._id)}
                  variant="white"
                  size="sm"
                  className="!bg-warning !text-white hover:brightness-110"
                >
                  <MessageSquare size={16} /> Plus d'infos
                </Button>
                <Button
                  onClick={() => handleReject(selected._id)}
                  disabled={actionLoading}
                  variant="danger"
                  size="sm"
                >
                  <X size={16} /> Rejeter
                </Button>
              </div>
              <input
                type="text"
                placeholder="Raison du rejet (optionnel)"
                className="input-field text-sm"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="font-bold text-lg mb-3">Carte des alertes actives</h2>
            <IncidentMap
              incidents={[...pending, ...activeIncidents]}
              center={CAMEROON_CENTER}
              height="300px"
            />
          </div>

          <div>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Truck size={20} /> Ressources
            </h2>
            <div className="space-y-2">
              {resources.slice(0, 6).map((r) => (
                <div key={r._id} className="flex items-center justify-between bg-white border rounded-lg p-3 text-sm">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-gray-500 text-xs">{r.type}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    r.status === 'disponible' ? 'bg-green-100 text-green-700' :
                    r.status === 'en_mission' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-3">Interventions en cours</h2>
            {activeIncidents.map((inc) => (
              <div key={inc._id} className="bg-white border rounded-lg p-3 mb-2 text-sm">
                <p className="font-medium">{INCIDENT_TYPES[inc.type]?.label}</p>
                <div className="flex gap-2 mt-2">
                  {['en_route', 'sur_place', 'terminee'].map((s) => (
                    <Button
                      key={s}
                      onClick={() => handleIntervention(inc._id, s)}
                      variant={inc.intervention?.status === s ? 'primary' : 'ghost'}
                      size="sm"
                      className="!text-xs capitalize"
                    >
                      {s.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default function AgentDashboard() {
  return (
    <ProtectedRoute roles={['agent', 'moderateur', 'admin']}>
      <AgentDashboardContent />
    </ProtectedRoute>
  );
}
