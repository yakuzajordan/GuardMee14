import { useState, useEffect, useCallback } from 'react';
import { Filter, Flame, X, MapPin } from 'lucide-react';
import Layout from '../components/Layout';
import IncidentMap from '../components/IncidentMap';
import { incidentAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { INCIDENT_TYPES, CAMEROON_CENTER } from '../utils/constants';
import { useI18n } from '../context/i18nContext';

export default function MapPage() {
  const { t } = useI18n();
  const [incidents, setIncidents] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [filters, setFilters] = useState({ type: '', urgency: '' });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [center, setCenter] = useState(CAMEROON_CENTER);
  const { liveIncidents } = useSocket();

  const fetchIncidents = useCallback(async () => {
    try {
      const params = { status: 'valide' };
      if (filters.type) params.type = filters.type;
      if (filters.urgency) params.urgency = filters.urgency;
      const res = await incidentAPI.list(params);
      setIncidents(res.data.incidents);
    } catch {
      // silently fail
    }
  }, [filters]);

  const fetchHeatmap = useCallback(async () => {
    try {
      const res = await incidentAPI.heatmap();
      setHeatmapPoints(res.data.points);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchHeatmap();
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, [fetchIncidents, fetchHeatmap]);

  useEffect(() => {
    if (liveIncidents.length > 0) {
      setIncidents((prev) => {
        const merged = [...liveIncidents.filter((i) => i.status === 'valide' || i.status === 'en_cours'), ...prev];
        const seen = new Set();
        return merged.filter((i) => {
          if (seen.has(i._id)) return false;
          seen.add(i._id);
          return true;
        });
      });
    }
  }, [liveIncidents]);

  const hasActiveFilters = filters.type || filters.urgency;

  return (
    <Layout fullWidth>
      <div className="relative h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
        <IncidentMap
          incidents={incidents}
          center={center}
          zoom={13}
          height="100%"
          showHeatmap={showHeatmap}
          heatmapPoints={heatmapPoints}
        />

        {/* ── Top controls ── */}
        <div className="absolute top-4 left-4 right-4 flex gap-2 z-[1000]">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`shadow-lg rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-medium transition-all backdrop-blur-sm ${
              showFilters || hasActiveFilters
                ? 'bg-securite text-white'
                : 'bg-white/92 hover:bg-white'
            }`}
          >
            <Filter size={15} />
            {t('map.filters')}
            {hasActiveFilters && (
              <span className="bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>
            )}
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`shadow-lg rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-medium transition-all backdrop-blur-sm ${
              showHeatmap ? 'bg-urgence text-white' : 'bg-white/92 hover:bg-white'
            }`}
          >
            <Flame size={15} />
            {t('map.heatmap')}
          </button>

          <div className="bg-white/92 backdrop-blur-sm shadow-lg rounded-xl px-4 py-2.5 text-sm font-medium ml-auto flex items-center gap-2">
            <MapPin size={14} className="text-urgence" />
            <span>{incidents.length} incident{incidents.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* ── Filters panel ── */}
        {showFilters && (
          <div className="absolute top-16 left-4 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl p-4 z-[1000] w-64 space-y-4 animate-slide-down border border-gray-200/80">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm text-gray-800">{t('map.filters')}</p>
              <button
                onClick={() => { setFilters({ type: '', urgency: '' }); setShowFilters(false); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('map.incidentType')}</label>
              <select
                className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-securite outline-none"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">{t('map.allTypes')}</option>
                {Object.entries(INCIDENT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('map.urgency')}</label>
              <select
                className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-securite outline-none"
                value={filters.urgency}
                onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
              >
                <option value="">{t('map.allLevels')}</option>
                <option value="faible">🟢 {t('incident.urgency.faible')}</option>
                <option value="moyen">🟡 {t('incident.urgency.moyen')}</option>
                <option value="eleve">🟠 {t('incident.urgency.eleve')}</option>
                <option value="critique">🔴 {t('incident.urgency.critique')}</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ type: '', urgency: '' })}
                className="w-full text-xs text-urgence font-medium hover:underline"
              >
                {t('map.clearFilters')}
              </button>
            )}
          </div>
        )}

        {/* ── Legend ── */}
        <div className="absolute bottom-20 md:bottom-4 left-4 bg-white/92 backdrop-blur-xl shadow-lg rounded-2xl p-3 z-[1000] text-xs border border-gray-200/80">
          <p className="font-bold text-gray-700 mb-2 text-xs uppercase tracking-wide">{t('map.legend')}</p>
          {[
            { color: '#38A169', label: t('incident.urgency.faible') },
            { color: '#D69E2E', label: t('incident.urgency.moyen') },
            { color: '#DD6B20', label: t('incident.urgency.eleve') },
            { color: '#E53E3E', label: t('incident.urgency.critique') },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2 py-0.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color, boxShadow: `0 0 4px ${l.color}60` }} />
              <span className="text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
