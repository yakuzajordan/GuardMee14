import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  writeBatch, deleteField, increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Helpers ───────────────────────────────────────────────────────────────

const toData = (snap) => snap.exists() ? { _id: snap.id, ...snap.data() } : null;
const toDocs = (snap) => snap.docs.map((d) => ({ _id: d.id, ...d.data() }));

// ─── Users ──────────────────────────────────────────────────────────────────

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return toData(snap);
};

export const createUserProfile = async (uid, data) => {
  const profile = {
    name: data.name || '',
    email: data.email || null,
    phone: data.phone || null,
    role: data.role || 'citoyen',
    avatar: data.avatar || '',
    isPhoneVerified: data.isPhoneVerified || false,
    isEmailVerified: data.isEmailVerified || false,
    credibilityScore: 50,
    alertRadius: 5000,
    isActive: true,
    preferences: { pushNotifications: true, smsAlerts: true, emailAlerts: true },
    fcmTokens: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', uid), profile);
  return { _id: uid, ...profile };
};

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const saveFCMTokenToFirestore = async (uid, token) => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const tokens = snap.data().fcmTokens || [];
  if (!tokens.includes(token)) {
    const updated = [...tokens, token].slice(-10);
    await updateDoc(ref, { fcmTokens: updated });
  }
};

export const getUsers = async ({ role, search, page = 1, limit: lim = 20 } = {}) => {
  let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(lim));
  if (role) q = query(collection(db, 'users'), where('role', '==', role), orderBy('createdAt', 'desc'), limit(lim));
  const snap = await getDocs(q);
  let users = toDocs(snap);
  if (search) {
    const s = search.toLowerCase();
    users = users.filter((u) =>
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.includes(s)
    );
  }
  return { users, total: users.length };
};

export const updateUserRole = async (uid, role) => {
  await updateDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() });
};

export const updateUserStatus = async (uid, isActive) => {
  await updateDoc(doc(db, 'users', uid), { isActive, updatedAt: serverTimestamp() });
};

// ─── Incidents ──────────────────────────────────────────────────────────────

const RISK_MAP = {
  agression: 'securite_personnes', accident: 'securite_routiere',
  incendie: 'catastrophe', inondation: 'catastrophe',
  coupure: 'infrastructure', vol: 'securite_biens', danger_sanitaire: 'sante_publique',
};
const URGENCY_MAP = {
  agression: 'eleve', accident: 'eleve', incendie: 'critique',
  inondation: 'eleve', coupure: 'faible', vol: 'moyen', danger_sanitaire: 'eleve',
};

const calcCredibility = (data, reporter) => {
  let score = 50;
  if (reporter) {
    score += Math.min((reporter.credibilityScore || 50) - 50, 20);
    if (reporter.isPhoneVerified) score += 10;
    if (reporter.isEmailVerified) score += 5;
  }
  if (data.media?.length > 0) score += 15;
  if (data.media?.length > 1) score += 5;
  if (data.description?.length > 50) score += 5;
  if (data.isAnonymous) score -= 10;
  return Math.max(0, Math.min(100, score));
};

export const createIncident = async (data, reporter = null) => {
  const coords = data.coordinates || [data.longitude, data.latitude];
  const incident = {
    type: data.type,
    description: data.description,
    location: {
      type: 'Point',
      coordinates: coords,
      address: data.address || '',
    },
    urgency: URGENCY_MAP[data.type] || 'moyen',
    riskCategory: RISK_MAP[data.type] || 'autre',
    status: 'en_attente',
    reporterId: reporter && !data.isAnonymous ? reporter._id : null,
    reporterName: reporter && !data.isAnonymous ? reporter.name : null,
    reporterCredibility: reporter ? reporter.credibilityScore : null,
    isAnonymous: Boolean(data.isAnonymous),
    media: data.media || [],
    offlineId: data.offlineId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  incident.credibilityScore = calcCredibility(incident, reporter);
  const ref = await addDoc(collection(db, 'incidents'), incident);
  return { _id: ref.id, ...incident };
};

export const getIncidents = async ({ type, status, urgency, page = 1, limit: lim = 50 } = {}) => {
  const constraints = [orderBy('createdAt', 'desc'), limit(parseInt(lim) * parseInt(page))];
  if (type) constraints.unshift(where('type', '==', type));
  if (urgency) constraints.unshift(where('urgency', '==', urgency));

  const validStatuses = status ? [status] : ['valide', 'en_cours', 'en_attente'];
  if (validStatuses.length === 1) {
    constraints.unshift(where('status', '==', validStatuses[0]));
  } else {
    constraints.unshift(where('status', 'in', validStatuses));
  }

  const snap = await getDocs(query(collection(db, 'incidents'), ...constraints));
  const incidents = toDocs(snap);
  const skip = (parseInt(page) - 1) * parseInt(lim);
  const paginated = incidents.slice(skip, skip + parseInt(lim));
  return { incidents: paginated, pagination: { page: parseInt(page), limit: parseInt(lim), total: incidents.length } };
};

export const getIncident = async (id) => {
  const snap = await getDoc(doc(db, 'incidents', id));
  return toData(snap);
};

export const getUserIncidents = async (userId) => {
  const q = query(
    collection(db, 'incidents'),
    where('reporterId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return toDocs(snap);
};

export const getHeatmapPoints = async () => {
  const q = query(
    collection(db, 'incidents'),
    where('status', 'in', ['valide', 'en_cours'])
  );
  const snap = await getDocs(q);
  const urgencyWeight = { critique: 4, eleve: 3, moyen: 2, faible: 1 };
  return toDocs(snap).map((i) => {
    const coords = i.location?.coordinates || [11.5021, 3.848];
    return { lat: coords[1], lng: coords[0], weight: urgencyWeight[i.urgency] || 1 };
  });
};

export const updateIncident = async (id, data) => {
  await updateDoc(doc(db, 'incidents', id), { ...data, updatedAt: serverTimestamp() });
  return getIncident(id);
};

export const syncIncidents = async (incidents, userId) => {
  const batch = writeBatch(db);
  const synced = [];
  for (const item of incidents) {
    const coords = item.coordinates || [item.longitude, item.latitude];
    const ref = doc(collection(db, 'incidents'));
    const incident = {
      type: item.type,
      description: item.description,
      location: { type: 'Point', coordinates: coords, address: item.address || '' },
      urgency: URGENCY_MAP[item.type] || 'moyen',
      riskCategory: RISK_MAP[item.type] || 'autre',
      status: 'en_attente',
      reporterId: userId,
      isAnonymous: false,
      media: [],
      offlineId: item.offlineId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(ref, incident);
    synced.push({ _id: ref.id, ...incident });
  }
  await batch.commit();
  return synced;
};

export const getPendingIncidents = async ({ urgency, type, page = 1, limit: lim = 20 } = {}) => {
  const constraints = [
    where('status', 'in', ['en_attente', 'info_requise']),
    orderBy('createdAt', 'asc'),
    limit(parseInt(lim)),
  ];
  if (urgency) constraints.unshift(where('urgency', '==', urgency));
  if (type) constraints.unshift(where('type', '==', type));
  const snap = await getDocs(query(collection(db, 'incidents'), ...constraints));
  const incidents = toDocs(snap);
  return { incidents, total: incidents.length };
};

// ─── Alerts ─────────────────────────────────────────────────────────────────

export const getAlerts = async ({ active = true } = {}) => {
  const constraints = [orderBy('createdAt', 'desc')];
  if (active) constraints.unshift(where('isActive', '==', true));
  const snap = await getDocs(query(collection(db, 'alerts'), ...constraints));
  return toDocs(snap);
};

export const createAlert = async (data, userId) => {
  const alert = {
    incidentId: data.incidentId || null,
    title: data.title,
    message: data.message,
    severity: data.severity || 'attention',
    isActive: true,
    targetArea: {
      type: 'Point',
      coordinates: data.coordinates || [11.5021, 3.848],
      radius: data.radius || 5000,
    },
    createdById: userId,
    channels: data.channels || { push: true },
    recipientCount: 0,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'alerts'), alert);
  return { _id: ref.id, ...alert };
};

export const deactivateAlert = async (id) => {
  await updateDoc(doc(db, 'alerts', id), { isActive: false });
};

// ─── Resources ──────────────────────────────────────────────────────────────

export const getResources = async ({ status, type } = {}) => {
  const constraints = [orderBy('createdAt', 'desc')];
  if (status) constraints.unshift(where('status', '==', status));
  if (type) constraints.unshift(where('type', '==', type));
  const snap = await getDocs(query(collection(db, 'resources'), ...constraints));
  return toDocs(snap);
};

export const createResource = async (data, userId, userName) => {
  const resource = {
    name: data.name,
    type: data.type,
    description: data.description || '',
    location: { type: 'Point', coordinates: data.coordinates, address: data.address || '' },
    status: 'disponible',
    capacity: data.capacity || 0,
    contactPhone: data.contactPhone || '',
    managedById: userId,
    managedByName: userName,
    assignedIncidentId: null,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'resources'), resource);
  return { _id: ref.id, ...resource };
};

export const updateResource = async (id, data) => {
  await updateDoc(doc(db, 'resources', id), data);
};

// ─── Notifications ──────────────────────────────────────────────────────────

export const getNotifications = async (userId) => {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  const notifications = toDocs(snap);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return { notifications, unreadCount };
};

export const markNotificationRead = async (userId, notifId) => {
  await updateDoc(doc(db, 'notifications', userId, 'items', notifId), { isRead: true });
};

export const markAllNotificationsRead = async (userId) => {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    where('isRead', '==', false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
  await batch.commit();
};

export const createNotification = async (userId, data) => {
  const notif = {
    type: data.type || 'systeme',
    title: data.title,
    message: data.message,
    isRead: false,
    data: data.data || {},
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'notifications', userId, 'items'), notif);
  return { _id: ref.id, ...notif };
};

// ─── Admin Stats ─────────────────────────────────────────────────────────────

export const getAdminStats = async () => {
  const [incSnap, userSnap, alertSnap, resourceSnap] = await Promise.all([
    getDocs(query(collection(db, 'incidents'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'alerts')),
    getDocs(collection(db, 'resources')),
  ]);

  const incidents = toDocs(incSnap);
  const byTypeMap = {};
  const byStatusMap = {};
  const byUrgencyMap = {};

  incidents.forEach((i) => {
    byTypeMap[i.type] = (byTypeMap[i.type] || 0) + 1;
    byStatusMap[i.status] = (byStatusMap[i.status] || 0) + 1;
    byUrgencyMap[i.urgency] = (byUrgencyMap[i.urgency] || 0) + 1;
  });

  return {
    byType: Object.entries(byTypeMap).map(([_id, count]) => ({ _id, count })),
    byStatus: Object.entries(byStatusMap).map(([_id, count]) => ({ _id, count })),
    byUrgency: Object.entries(byUrgencyMap).map(([_id, count]) => ({ _id, count })),
    totalIncidents: incidents.length,
    totalAlerts: alertSnap.size,
    totalResources: resourceSnap.size,
    totalUsers: userSnap.size,
    recentIncidents: incidents.slice(0, 5),
  };
};

// ─── Seed Demo Data ───────────────────────────────────────────────────────────

export const seedDemoData = async () => {
  const adminSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin'), limit(1)));
  if (!adminSnap.empty) return { message: 'Données déjà initialisées' };

  const batch = writeBatch(db);

  const demoIncidents = [
    {
      type: 'accident', description: 'Collision entre deux véhicules au carrefour Bastos.',
      location: { type: 'Point', coordinates: [11.5123, 3.8792], address: 'Carrefour Bastos, Yaoundé' },
      urgency: 'eleve', status: 'valide', isAnonymous: false, media: [],
      credibilityScore: 90, riskCategory: 'securite_routiere',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    },
    {
      type: 'incendie', description: 'Départ de feu dans un entrepôt commercial à Akwa.',
      location: { type: 'Point', coordinates: [9.7042, 4.0511], address: 'Boulevard de la Liberté, Akwa, Douala' },
      urgency: 'critique', status: 'en_cours', isAnonymous: false, media: [],
      credibilityScore: 98, riskCategory: 'catastrophe',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    },
    {
      type: 'inondation', description: 'Montée des eaux suite aux fortes pluies. Chaussée impraticable secteur Bonabéri.',
      location: { type: 'Point', coordinates: [9.6644, 4.0722], address: 'Ancienne route, Bonabéri, Douala' },
      urgency: 'moyen', status: 'valide', isAnonymous: false, media: [],
      credibilityScore: 80, riskCategory: 'catastrophe',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    },
  ];

  for (const inc of demoIncidents) {
    batch.set(doc(collection(db, 'incidents')), inc);
  }

  await batch.commit();
  return { message: 'Données de démo créées' };
};

// ─── Real-time Listeners ──────────────────────────────────────────────────────

export const subscribeToIncidents = (callback) => {
  const q = query(
    collection(db, 'incidents'),
    where('status', 'in', ['valide', 'en_cours', 'en_attente']),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    callback(toDocs(snap));
  });
};

export const subscribeToNotifications = (userId, callback) => {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const notifications = toDocs(snap);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    callback({ notifications, unreadCount });
  });
};

// ─── Messages (chat citoyen ↔ agent) ─────────────────────────────────────────

export const getMessages = async (incidentId) => {
  const q = query(
    collection(db, 'incidents', incidentId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  const snap = await getDocs(q);
  return toDocs(snap);
};

export const sendMessage = async (incidentId, { text, senderId, senderName, senderRole }) => {
  const msg = {
    text,
    senderId,
    senderName: senderName || 'Utilisateur',
    senderRole: senderRole || 'citoyen',
    isRead: false,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'incidents', incidentId, 'messages'), msg);
  await updateDoc(doc(db, 'incidents', incidentId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    hasUnreadMessages: true,
    updatedAt: serverTimestamp(),
  });
  return { _id: ref.id, ...msg };
};

export const subscribeToMessages = (incidentId, callback) => {
  const q = query(
    collection(db, 'incidents', incidentId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => callback(toDocs(snap)));
};

// ─── AI Config (persistée en Firestore) ──────────────────────────────────────

const AI_CONFIG_DOC = 'global/ai_config';

export const getAIConfig = async () => {
  try {
    const snap = await getDoc(doc(db, 'config', 'ai'));
    if (snap.exists()) return snap.data();
  } catch {}
  return { autoClassify: true, minCredibilityForAutoValidate: 80, blockedKeywords: ['fake', 'test'] };
};

export const saveAIConfig = async (config) => {
  await setDoc(doc(db, 'config', 'ai'), { ...config, updatedAt: serverTimestamp() }, { merge: true });
  return config;
};

// ─── User Incidents with pagination ──────────────────────────────────────────

export const getUserIncidentsPaginated = async (userId, { page = 1, lim = 10, type = '', status = '' } = {}) => {
  const constraints = [
    where('reporterId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(lim * page),
  ];
  if (type) constraints.unshift(where('type', '==', type));
  if (status) constraints.unshift(where('status', '==', status));

  const snap = await getDocs(query(collection(db, 'incidents'), ...constraints));
  const all = toDocs(snap);
  const skip = (page - 1) * lim;
  return { incidents: all.slice(skip, skip + lim), total: all.length };
};
