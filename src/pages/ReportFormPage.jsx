import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Wifi, WifiOff, Radio, ChevronLeft, Send } from 'lucide-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import IncidentMap from '../components/IncidentMap';
import LiveVideoRecorder from '../components/LiveVideoRecorder';
import { incidentAPI } from '../services/api';
import { getApiErrorMessage } from '../services/api';
import { INCIDENT_TYPES, CAMEROON_CENTER, saveOfflineIncident } from '../utils/constants';
import { useI18n } from '../context/i18nContext';

const incidentColors = {
  agression:   'border-red-400 bg-red-50 text-red-700',
  accident:    'border-orange-400 bg-orange-50 text-orange-700',
  incendie:    'border-red-500 bg-red-50 text-red-800',
  inondation:  'border-blue-400 bg-blue-50 text-blue-700',
  vol:         'border-purple-400 bg-purple-50 text-purple-700',
  default:     'border-gray-300 bg-gray-50 text-gray-700',
};

const getIncidentColor = (key) => incidentColors[key] || incidentColors.default;

function ReportFormContent() {
  const navigate = useNavigate();
  const { t } = useI18n();
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
    const onOnline  = () => setIsOnline(true);
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
      setSuccessMessage(t('form.offline'));
      setLoading(false);
      setTimeout(() => navigate('/dashboard'), 2500);
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(incidentData).forEach(([k, v]) => formData.append(k, v));
      media.forEach((file) => formData.append('media', file));

      await incidentAPI.create(formData);
      setSuccess(true);
      setSuccessMessage(t('form.successMsg'));
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur lors du signalement'));
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (success) {
    return (
      <Layout>
        <div className="text-center py-16 max-w-md mx-auto animate-bounce-in">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <svg className="w-12 h-12 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-success mb-2">{t('form.success')}</h2>
          <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">{successMessage}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-securite border-t-transparent rounded-full animate-spin" />
            Redirection vers le tableau de bord...
          </div>
        </div>
      </Layout>
    );
  }

  /* ── Form ── */
  const completionSteps = [
    !!form.type,
    !!form.description.trim(),
    !!position,
  ];
  const progress = Math.round((completionSteps.filter(Boolean).length / completionSteps.length) * 100);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors active:scale-95"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{t('form.title')}</h1>
            <p className="text-gray-400 text-xs mt-0.5">{t('form.subtitle')}</p>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
            isOnline ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
          }`}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? t('common.online') : t('common.offline')}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 animate-fade-in-up delay-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Progression du formulaire</span>
            <span className="text-xs font-bold text-securite">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-securite to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 text-urgence text-sm p-3.5 rounded-xl border border-red-100 animate-slide-down">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Live video */}
          <div className="animate-fade-in-up delay-200">
            <button
              type="button"
              onClick={() => setShowLiveVideo(!showLiveVideo)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                showLiveVideo
                  ? 'border-urgence bg-red-50 shadow-md shadow-urgence/10'
                  : 'border-gray-200 hover:border-urgence/50 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  showLiveVideo ? 'bg-urgence' : 'bg-gray-100'
                }`}>
                  <Radio size={20} className={showLiveVideo ? 'text-white' : 'text-gray-500'} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-800">{t('form.live')}</p>
                  <p className="text-xs text-gray-400">{t('form.liveSub')}</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                showLiveVideo ? 'bg-urgence text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {showLiveVideo ? 'Actif' : 'Démarrer'}
              </span>
            </button>

            {showLiveVideo && !liveCompleted && (
              <div className="mt-3 animate-slide-down">
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

          {/* Incident type */}
          <div className="animate-fade-in-up delay-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-urgence text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
              {t('form.type')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.entries(INCIDENT_TYPES).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, type: key })}
                  className={`p-3.5 rounded-xl border-2 text-sm text-left transition-all active:scale-95 ${
                    form.type === key
                      ? `${getIncidentColor(key)} border-current shadow-md`
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl block mb-1.5">{icon}</span>
                  <p className="font-semibold text-xs leading-tight">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="animate-fade-in-up delay-300">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-securite text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
              {t('form.description')}
            </label>
            <div className="relative">
              <textarea
                required
                rows={4}
                maxLength={2000}
                placeholder={t('form.descPlaceholder')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-securite focus:ring-4 focus:ring-securite/10 outline-none resize-none transition-all text-sm bg-white"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <span className="absolute bottom-3 right-3 text-xs text-gray-300">
                {form.description.length}/2000
              </span>
            </div>
          </div>

          {/* Location */}
          <div className="animate-fade-in-up delay-300">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-5 h-5 bg-success text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
                <MapPin size={15} className="text-success" />
                {t('form.location')}
              </label>
              <button
                type="button"
                onClick={getGPS}
                className="flex items-center gap-1.5 text-securite text-xs font-medium hover:text-securite-dark transition-colors px-2.5 py-1.5 rounded-lg hover:bg-blue-50"
                disabled={gpsLoading}
              >
                {gpsLoading ? (
                  <><span className="w-3 h-3 border-2 border-securite border-t-transparent rounded-full animate-spin" /> Localisation...</>
                ) : (
                  <><MapPin size={13} /> {t('form.gpsRefresh')}</>
                )}
              </button>
            </div>
            {position ? (
              <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm">
                <IncidentMap
                  center={position}
                  zoom={15}
                  height="250px"
                  onLocationSelect={setPosition}
                  selectedPosition={position}
                  interactive
                />
              </div>
            ) : (
              <div className="h-[250px] bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-securite border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Obtention de votre position...</p>
                </div>
              </div>
            )}
            <input
              type="text"
              placeholder="Adresse ou point de repère (optionnel)"
              className="w-full mt-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-securite focus:ring-4 focus:ring-securite/10 outline-none transition-all"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {/* Media upload */}
          <div className="animate-fade-in-up delay-400">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Camera size={15} className="text-gray-500" />
              Photos / Vidéos <span className="text-gray-400 font-normal">(max 5 fichiers)</span>
            </label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-securite hover:bg-blue-50/30 transition-all group">
              <div className="text-center">
                <Camera size={24} className="text-gray-300 group-hover:text-securite transition-colors mx-auto mb-1" />
                <p className="text-sm text-gray-400 group-hover:text-securite transition-colors">
                  {media.length > 0 ? `${media.length} fichier(s) sélectionné(s)` : 'Cliquez pour ajouter des photos'}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">Images ou vidéos · JPG, PNG, MP4</p>
              </div>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaChange}
                className="hidden"
              />
            </label>
            {media.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {media.map((file, i) => (
                  <div key={i} className="px-3 py-1 bg-blue-50 text-securite text-xs rounded-lg border border-blue-100 font-medium">
                    {file.name.length > 20 ? file.name.slice(0, 20) + '…' : file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anonymous toggle */}
          <div className="animate-fade-in-up delay-400">
            <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all group">
              <div className={`w-10 h-6 rounded-full transition-all relative ${form.isAnonymous ? 'bg-securite' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isAnonymous ? 'left-5' : 'left-1'}`} />
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                  className="sr-only"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{t('form.anonymous')}</p>
                <p className="text-xs text-gray-400">{t('form.anonymousSub')}</p>
              </div>
            </label>
          </div>

          {/* Submit */}
          {!showLiveVideo && (
            <div className="animate-fade-in-up delay-500 pb-2">
              <button
                type="submit"
                disabled={loading || !form.type || !form.description || !position}
                className="w-full py-4 bg-gradient-to-r from-urgence to-urgence-dark text-white rounded-2xl font-bold text-base hover:from-urgence-dark hover:to-red-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-urgence/30 flex items-center justify-center gap-2.5 active:scale-[0.98] glow-urgence"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    {t('form.submit')}
                  </>
                )}
              </button>
              {(!form.type || !form.description || !position) && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Remplissez les champs obligatoires pour envoyer
                </p>
              )}
            </div>
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
