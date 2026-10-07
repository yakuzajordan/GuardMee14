export const INCIDENT_TYPES = {
  agression: { label: 'Agression', icon: '⚠️', color: '#E53E3E' },
  accident: { label: 'Accident', icon: '🚗', color: '#DD6B20' },
  incendie: { label: 'Incendie', icon: '🔥', color: '#C53030' },
  inondation: { label: 'Inondation', icon: '🌊', color: '#2B6CB0' },
  coupure: { label: 'Coupure électricité/eau', icon: '⚡', color: '#D69E2E' },
  vol: { label: 'Vol', icon: '🔒', color: '#805AD5' },
  danger_sanitaire: { label: 'Danger sanitaire', icon: '🏥', color: '#E53E3E' },
};

export const URGENCY_COLORS = {
  faible: '#38A169',
  moyen: '#D69E2E',
  eleve: '#DD6B20',
  critique: '#E53E3E',
};

export const STATUS_LABELS = {
  en_attente: 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté',
  info_requise: 'Info requise',
  en_cours: 'En cours',
  resolu: 'Résolu',
};

export const ROLE_LABELS = {
  citoyen: 'Citoyen',
  moderateur: 'Modérateur',
  agent: 'Agent sécurité',
  admin: 'Administrateur',
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  if (phone.startsWith('+237')) {
    const n = phone.slice(4);
    return `+237 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  return phone;
};

export const formatDate = (date) =>
  new Date(date?.toDate ? date.toDate() : date).toLocaleString('fr-CM', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export const CAMEROON_CENTER = [3.848, 11.5021]; // Yaoundé [lat, lng]
export const DEFAULT_ZOOM = 13;

export const OFFLINE_QUEUE_KEY = 'guardmee_offline_incidents';

export const saveOfflineIncident = (incident) => {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  queue.push({ ...incident, offlineId: `offline_${Date.now()}`, savedAt: new Date().toISOString() });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const getOfflineIncidents = () =>
  JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');

export const clearOfflineIncidents = () =>
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
