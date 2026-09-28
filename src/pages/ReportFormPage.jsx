import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Wifi, WifiOff, Radio } from 'lucide-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import IncidentMap from '../components/IncidentMap';
import LiveVideoRecorder from '../components/LiveVideoRecorder';
import { incidentAPI } from '../services/api';
import { getApiErrorMessage } from '../services/api';
import { INCIDENT_TYPES, CAMEROON_CENTER, saveOfflineIncident } from '../utils/constants';

function ReportFormContent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: '', description: '', isAnonymous: false, address: '',
  });
  const [position, setPosition] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLiveVideo, setShowLiveVideo] = useState(false);
  const [liveCompleted, setLiveCompleted] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const getGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setGpsLoading(false);
      },
      () => {
        setPosition(CAMEROON_CENTER);
        setGpsLoading(false);
        setError('GPS indisponible, position par défaut (Yaoundé)');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { getGPS(); }, []);

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setMedia(files);
  };

  const handleLiveComplete = (data) => {
    setLiveCompleted(true);
    setSuccess(true);
    setSuccessMessage(data.message || 'Vidéo transmise avec succès');
    setTimeout(() => navigate('/dashboard'), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type || !form.description || !position) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    setError('');

    const incidentData = {
      type: form.type,
      description: form.description,
      latitude: position[0],
      longitude: position[1],
      address: form.address,
      isAnonymous: form.isAnonymous,
    };

    if (!isOnline) {
      saveOfflineIncident(incidentData);
      setSuccess(true);
      setSuccessMessage('Sauvegardé hors-ligne, sera synchronisé à la reconnexion.');
      setLoading(false);
      setTimeout(() => navigate('/dashboard'), 2000);
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(incidentData).forEach(([k, v]) => formData.append(k, v));
      media.forEach((file) => formData.append('media', file));

      await incidentAPI.create(formData);
      setSuccess(true);
      setSuccessMessage('Les agents ont été notifiés.');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur lors du signalement'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="text-center py-16 max-w-md mx-auto">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-success">Signalement envoyé !</h2>
          <p className="text-gray-500 mt-2">{successMessage}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Signaler un incident</h1>
            <p className="text-gray-500 text-sm">Rapide et géolocalisé</p>
          </div>
          <div className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'En ligne' : 'Hors-ligne'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 text-urgence text-sm p-3 rounded-lg">{error}</div>}

          {/* Filmer en direct */}
          <div>
            <button
              type="button"
              onClick={() => setShowLiveVideo(!showLiveVideo)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${
                showLiveVideo ? 'border-urgence bg-red-50' : 'border-gray-200 hover:border-urgence'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-urgence text-white rounded-full flex items-center justify-center">
                  <Radio size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Filmer en direct</p>
                  <p className="text-xs text-gray-500">Stream vidéo + analyse IA automatique</p>
                </div>
              </div>
              <span className="text-urgence text-sm font-medium">
                {showLiveVideo ? 'Masquer' : 'Ouvrir'}
              </span>
            </button>

            {showLiveVideo && !liveCompleted && (
              <div className="mt-3">
                <LiveVideoRecorder
                  coordinates={position}
                  address={form.address}
                  incidentType={form.type}
                  description={form.description}
                  isAnonymous={form.isAnonymous}
                  onComplete={handleLiveComplete}
                  onError={(msg) => setError(msg)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type d'incident *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(INCIDENT_TYPES).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, type: key })}
                  className={`p-3 rounded-xl border text-sm text-left transition ${
                    form.type === key ? 'border-urgence bg-red-50 text-urgence' : 'hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <p className="font-medium mt-1">{label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              required rows={4} maxLength={2000}
              placeholder="Décrivez ce qui s'est passé..."
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-securite outline-none resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <MapPin size={16} /> Localisation *
              </label>
              <button type="button" onClick={getGPS} className="text-securite text-sm hover:underline">
                {gpsLoading ? 'Localisation...' : 'Actualiser GPS'}
              </button>
            </div>
            {position && (
              <IncidentMap
                center={position}
                zoom={15}
                height="250px"
                onLocationSelect={setPosition}
                selectedPosition={position}
                interactive
              />
            )}
            <input
              type="text"
              placeholder="Adresse (optionnel)"
              className="w-full mt-2 px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-securite outline-none"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1">
              <Camera size={16} /> Photos / Vidéos (upload classique, max 5)
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Alternative si la caméra en direct n'est pas disponible
            </p>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-securite file:text-white"
            />
            {media.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{media.length} fichier(s) sélectionné(s)</p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isAnonymous}
              onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
              className="w-4 h-4 accent-urgence"
            />
            <span className="text-sm">Signalement anonyme</span>
          </label>

          {!showLiveVideo && (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-urgence text-white rounded-xl font-bold text-lg hover:bg-urgence-dark transition disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Envoi en cours...' : '🚨 Envoyer le signalement'}
            </button>
          )}
        </form>
      </div>
    </Layout>
  );
}

export default function ReportFormPage() {
  return (
    <ProtectedRoute>
      <ReportFormContent />
    </ProtectedRoute>
  );
}
