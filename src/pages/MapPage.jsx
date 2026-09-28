import { useState, useEffect, useCallback } from 'react';
import { Filter, Flame } from 'lucide-react';
import Layout from '../components/Layout';
import IncidentMap from '../components/IncidentMap';
import { incidentAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { INCIDENT_TYPES, CAMEROON_CENTER } from '../utils/constants';

export default function MapPage() {
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

        <div className="absolute top-4 left-4 right-4 flex gap-2 z-[1000]">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white shadow-lg rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium"
          >
            <Filter size={16} /> Filtres
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`shadow-lg rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium ${
              showHeatmap ? 'bg-urgence text-white' : 'bg-white'
            }`}
          >
            <Flame size={16} /> Heatmap
          </button>
          <div className="bg-white shadow-lg rounded-xl px-4 py-2 text-sm font-medium ml-auto">
            {incidents.length} incident(s)
          </div>
        </div>

        {showFilters && (
          <div className="absolute top-16 left-4 bg-white shadow-xl rounded-xl p-4 z-[1000] w-64 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Type</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">Tous</option>
                {Object.entries(INCIDENT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Urgence</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                value={filters.urgency}
                onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
              >
                <option value="">Toutes</option>
                <option value="faible">Faible</option>
                <option value="moyen">Moyen</option>
                <option value="eleve">Élevé</option>
                <option value="critique">Critique</option>
              </select>
            </div>
          </div>
        )}

        <div className="absolute bottom-20 md:bottom-4 left-4 bg-white/90 backdrop-blur shadow-lg rounded-xl p-3 z-[1000] text-xs space-y-1">
          <p className="font-bold mb-1">Légende urgence</p>
          {[
            { color: '#38A169', label: 'Faible' },
            { color: '#D69E2E', label: 'Moyen' },
            { color: '#DD6B20', label: 'Élevé' },
            { color: '#E53E3E', label: 'Critique' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
