import { v4 as uuidv4 } from 'uuid';
import * as devUserStore from './devUserStore.js';

// Stockage en mémoire des entités en mode développement
const incidents = new Map();
const alerts = new Map();
const resources = new Map();
const notifications = new Map();

export const seedDevData = async () => {
  await devUserStore.seedDevUsers();

  if (incidents.size > 0) return;

  const admin = devUserStore.findByEmail('admin@guardmee.cm');
  const agent = devUserStore.findByEmail('agent@guardmee.cm');

  // 1. Incidents de démonstration au Cameroun
  const demoIncidents = [
    {
      _id: 'inc-001',
      type: 'accident',
      description: 'Collision entre deux véhicules au carrefour Bastos. Voie partiellement bloquée, secours en route.',
      location: {
        type: 'Point',
        coordinates: [11.5123, 3.8792], // Yaoundé Bastos [lng, lat]
        address: 'Carrefour Bastos, Yaoundé',
      },
      urgency: 'eleve',
      riskCategory: 'accidents',
      status: 'valide',
      reporter: { _id: admin?._id, name: 'Administrateur', credibilityScore: 85 },
      credibilityScore: 90,
      isAnonymous: false,
      isLiveStream: false,
      media: [],
      createdAt: new Date(Date.now() - 3600000 * 2), // Il y a 2h
      updatedAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      _id: 'inc-002',
      type: 'incendie',
      description: 'Départ de feu dans un entrepôt commercial à Akwa. Forte fumée visible.',
      location: {
        type: 'Point',
        coordinates: [9.7042, 4.0511], // Douala Akwa [lng, lat]
        address: 'Boulevard de la Liberté, Akwa, Douala',
      },
      urgency: 'critique',
      riskCategory: 'incendies',
      status: 'en_cours',
      reporter: { _id: agent?._id, name: 'Agent Sécurité', credibilityScore: 95 },
      credibilityScore: 98,
      isAnonymous: false,
      isLiveStream: true,
      media: [],
      createdAt: new Date(Date.now() - 3600000 * 5),
      updatedAt: new Date(Date.now() - 3600000 * 1),
    },
    {
      _id: 'inc-003',
      type: 'inondation',
      description: 'Montée des eaux suite aux fortes pluies. Chaussée impraticable secteur Bonabéri.',
      location: {
        type: 'Point',
        coordinates: [9.6644, 4.0722], // Douala Bonabéri [lng, lat]
        address: 'Ancienne route, Bonabéri, Douala',
      },
      urgency: 'moyen',
      riskCategory: 'naturel',
      status: 'valide',
      reporter: { _id: admin?._id, name: 'Citoyen Vigilant', credibilityScore: 75 },
      credibilityScore: 80,
      isAnonymous: false,
      isLiveStream: false,
      media: [],
      createdAt: new Date(Date.now() - 3600000 * 12),
      updatedAt: new Date(Date.now() - 3600000 * 8),
    },
    {
      _id: 'inc-004',
      type: 'agression',
      description: 'Tentative de vol à l\'arraché signalée près du marché Mokolo.',
      location: {
        type: 'Point',
        coordinates: [11.4988, 3.8711], // Yaoundé Mokolo [lng, lat]
        address: 'Marché Mokolo, Yaoundé',
      },
      urgency: 'eleve',
      riskCategory: 'securite',
      status: 'en_attente',
      reporter: { _id: admin?._id, name: 'Témoin', credibilityScore: 60 },
      credibilityScore: 65,
      isAnonymous: true,
      isLiveStream: false,
      media: [],
      createdAt: new Date(Date.now() - 1800000), // Il y a 30 min
      updatedAt: new Date(Date.now() - 1800000),
    },
    {
      _id: 'inc-005',
      type: 'eboulement',
      description: 'Glissement de terrain mineur sur l\'axe lourd Bafoussam.',
      location: {
        type: 'Point',
        coordinates: [10.4167, 5.4778], // Bafoussam [lng, lat]
        address: 'Entrée Sud, Bafoussam',
      },
      urgency: 'moyen',
      riskCategory: 'naturel',
      status: 'valide',
      reporter: { _id: agent?._id, name: 'Patrouille Ouest', credibilityScore: 90 },
      credibilityScore: 85,
      isAnonymous: false,
      isLiveStream: false,
      media: [],
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000),
    },
  ];

  for (const inc of demoIncidents) {
    incidents.set(inc._id, inc);
  }

  // 2. Alertes actives de démonstration
  const demoAlerts = [
    {
      _id: 'alt-001',
      incident: 'inc-002',
      title: 'Alerte Incendie Akwa',
      message: 'Incendie majeur en cours à Akwa (Douala). Évitez le Boulevard de la Liberté.',
      severity: 'critique',
      isActive: true,
      targetArea: { type: 'Point', coordinates: [9.7042, 4.0511], radius: 5000 },
      createdBy: agent?._id,
      channels: { push: true, securityChannel: true },
      recipientCount: 1420,
      createdAt: new Date(Date.now() - 3600000 * 4),
    },
    {
      _id: 'alt-002',
      incident: 'inc-001',
      title: 'Ralentissement Bastos Yaoundé',
      message: 'Accident au carrefour Bastos. Ralentissements importants signalés.',
      severity: 'attention',
      isActive: true,
      targetArea: { type: 'Point', coordinates: [11.5123, 3.8792], radius: 3000 },
      createdBy: admin?._id,
      channels: { push: true },
      recipientCount: 850,
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
  ];

  for (const alt of demoAlerts) {
    alerts.set(alt._id, alt);
  }

  // 3. Ressources d'intervention d'urgence au Cameroun
  const demoResources = [
    {
      _id: 'res-001',
      name: 'Ambulance SAMU Yaoundé 01',
      type: 'medical',
      status: 'disponible',
      description: 'Équipe médicale d\'intervention d\'urgence',
      location: { type: 'Point', coordinates: [11.5021, 3.848], address: 'Hôpital Central de Yaoundé' },
      capacity: 4,
      contactPhone: '+237222234020',
      managedBy: { _id: agent?._id, name: 'Agent Sécurité' },
      createdAt: new Date(),
    },
    {
      _id: 'res-002',
      name: 'Fourgon Pompe-Tonne Akwa',
      type: 'incendie',
      status: 'en_mission',
      description: 'Sapeurs-Pompiers 20e Compagnie Douala',
      location: { type: 'Point', coordinates: [9.7042, 4.0511], address: 'Caserne Akwa Douala' },
      capacity: 6,
      contactPhone: '+237233420118',
      managedBy: { _id: agent?._id, name: 'Agent Sécurité' },
      assignedIncident: 'inc-002',
      createdAt: new Date(),
    },
    {
      _id: 'res-003',
      name: 'Patrouille Mobile Police Yaoundé',
      type: 'securite',
      status: 'disponible',
      description: 'Brigade mobile d\'intervention rapide',
      location: { type: 'Point', coordinates: [11.518, 3.865], address: 'Commissariat Central Yaoundé' },
      capacity: 4,
      contactPhone: '117',
      managedBy: { _id: admin?._id, name: 'Administrateur' },
      createdAt: new Date(),
    },
    {
      _id: 'res-004',
      name: 'Équipe d\'Intervention Technique Eneo',
      type: 'technique',
      status: 'disponible',
      description: 'Maintenance réseau électrique et sécurisation câbles',
      location: { type: 'Point', coordinates: [9.72, 4.04], address: 'Direction Régionale Douala' },
      capacity: 3,
      contactPhone: '+237233420000',
      managedBy: { _id: admin?._id, name: 'Administrateur' },
      createdAt: new Date(),
    },
  ];

  for (const res of demoResources) {
    resources.set(res._id, res);
  }

  // 4. Notifications
  if (admin) {
    const notif1 = {
      _id: 'notif-001',
      user: admin._id,
      type: 'systeme',
      title: 'Bienvenue sur GuardMee',
      message: 'Mode développement local activé. Les données de test sont prêtes.',
      isRead: false,
      data: { link: '/dashboard' },
      createdAt: new Date(),
    };
    notifications.set(notif1._id, notif1);
  }

  console.log(`Données de démo prêtes: ${incidents.size} incidents, ${alerts.size} alertes, ${resources.size} ressources`);
};

// --- API Incidents ---
export const getIncidents = ({ type, status, urgency, page = 1, limit = 50 }) => {
  let list = Array.from(incidents.values());

  if (type) list = list.filter((i) => i.type === type);
  if (status) {
    list = list.filter((i) => i.status === status);
  } else {
    // Par défaut, afficher valide et en_cours
    list = list.filter((i) => ['valide', 'en_cours', 'en_attente'].includes(i.status));
  }
  if (urgency) list = list.filter((i) => i.urgency === urgency);

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = list.length;
  const skip = (page - 1) * limit;
  const paginated = list.slice(skip, skip + limit);

  return { incidents: paginated, pagination: { page: Number(page), limit: Number(limit), total } };
};

export const getIncidentById = (id) => incidents.get(id) || null;

export const createIncident = (data, user) => {
  const _id = data._id || `inc-${Date.now()}`;
  const now = new Date();
  const incident = {
    _id,
    type: data.type || 'autre',
    description: data.description || '',
    location: data.location || {
      type: 'Point',
      coordinates: data.coordinates || [11.5021, 3.848],
      address: data.address || 'Cameroun',
    },
    urgency: data.urgency || 'moyen',
    riskCategory: data.riskCategory || 'autre',
    status: data.status || 'valide',
    reporter: user ? { _id: user._id, name: user.name, credibilityScore: user.credibilityScore } : undefined,
    credibilityScore: 70,
    isAnonymous: Boolean(data.isAnonymous),
    isLiveStream: Boolean(data.isLiveStream),
    media: data.media || [],
    analyse_ia: data.analyse_ia,
    routedService: data.routedService,
    createdAt: now,
    updatedAt: now,
  };
  incidents.set(_id, incident);
  return incident;
};

export const updateIncident = (id, updates) => {
  const inc = incidents.get(id);
  if (!inc) return null;
  const updated = { ...inc, ...updates, updatedAt: new Date() };
  incidents.set(id, updated);
  return updated;
};

export const getPendingIncidents = ({ urgency, type, page = 1, limit = 20 }) => {
  let list = Array.from(incidents.values()).filter((i) =>
    ['en_attente', 'info_requise'].includes(i.status)
  );
  if (urgency) list = list.filter((i) => i.urgency === urgency);
  if (type) list = list.filter((i) => i.type === type);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = list.length;
  const skip = (page - 1) * limit;
  return { incidents: list.slice(skip, skip + limit), total };
};

export const getHeatmapPoints = () => {
  return Array.from(incidents.values())
    .filter((i) => ['valide', 'en_cours'].includes(i.status))
    .map((i) => {
      const coords = i.location?.coordinates || [11.5021, 3.848];
      const urgencyWeight = { critique: 4, eleve: 3, moyen: 2, faible: 1 };
      return {
        lat: coords[1],
        lng: coords[0],
        weight: urgencyWeight[i.urgency] || 1,
      };
    });
};

export const getUserIncidents = (userId) => {
  return Array.from(incidents.values())
    .filter((i) => i.reporter?._id === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// --- API Alertes ---
export const getAlerts = ({ active = true } = {}) => {
  let list = Array.from(alerts.values());
  if (active) list = list.filter((a) => a.isActive);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list.map((a) => ({
    ...a,
    incident: incidents.get(a.incident) || a.incident,
  }));
};

export const createAlert = (data, user) => {
  const _id = `alt-${Date.now()}`;
  const alert = {
    _id,
    incident: data.incidentId,
    title: data.title,
    message: data.message,
    severity: data.severity || 'attention',
    isActive: true,
    targetArea: {
      type: 'Point',
      coordinates: data.coordinates || [11.5021, 3.848],
      radius: data.radius || 5000,
    },
    createdBy: user?._id,
    channels: data.channels || { push: true },
    recipientCount: 0,
    createdAt: new Date(),
  };
  alerts.set(_id, alert);
  return alert;
};

export const deactivateAlert = (id) => {
  const alert = alerts.get(id);
  if (!alert) return null;
  alert.isActive = false;
  alerts.set(id, alert);
  return alert;
};

// --- API Ressources ---
export const getResources = ({ status, type } = {}) => {
  let list = Array.from(resources.values());
  if (status) list = list.filter((r) => r.status === status);
  if (type) list = list.filter((r) => r.type === type);
  return list;
};

export const createResource = (data, user) => {
  const _id = `res-${Date.now()}`;
  const res = {
    _id,
    name: data.name,
    type: data.type,
    description: data.description,
    location: {
      type: 'Point',
      coordinates: data.coordinates,
      address: data.address,
    },
    capacity: data.capacity,
    contactPhone: data.contactPhone,
    status: 'disponible',
    managedBy: user ? { _id: user._id, name: user.name } : undefined,
    createdAt: new Date(),
  };
  resources.set(_id, res);
  return res;
};

export const updateResource = (id, updates) => {
  const res = resources.get(id);
  if (!res) return null;
  const updated = { ...res, ...updates };
  resources.set(id, updated);
  return updated;
};

// --- API Notifications ---
export const getNotifications = (userId, unreadOnly = false) => {
  let list = Array.from(notifications.values()).filter((n) => n.user === userId);
  if (unreadOnly) list = list.filter((n) => !n.isRead);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = list.filter((n) => !n.isRead).length;
  return { notifications: list, unreadCount };
};

export const markNotificationRead = (id, userId) => {
  const notif = notifications.get(id);
  if (!notif || notif.user !== userId) return null;
  notif.isRead = true;
  notifications.set(id, notif);
  return notif;
};

export const markAllNotificationsRead = (userId) => {
  for (const [id, notif] of notifications.entries()) {
    if (notif.user === userId) {
      notif.isRead = true;
      notifications.set(id, notif);
    }
  }
};

export const addNotification = (userId, notifData) => {
  const _id = `notif-${Date.now()}`;
  const notif = {
    _id,
    user: userId,
    type: notifData.type || 'systeme',
    title: notifData.title,
    message: notifData.message,
    isRead: false,
    data: notifData.data || {},
    createdAt: new Date(),
  };
  notifications.set(_id, notif);
  return notif;
};

// --- API Admin Stats ---
export const getAdminStats = () => {
  const allIncidents = Array.from(incidents.values());

  const byTypeMap = {};
  const byStatusMap = {};
  const byUrgencyMap = {};

  allIncidents.forEach((i) => {
    byTypeMap[i.type] = (byTypeMap[i.type] || 0) + 1;
    byStatusMap[i.status] = (byStatusMap[i.status] || 0) + 1;
    byUrgencyMap[i.urgency] = (byUrgencyMap[i.urgency] || 0) + 1;
  });

  const byType = Object.entries(byTypeMap).map(([_id, count]) => ({ _id, count }));
  const byStatus = Object.entries(byStatusMap).map(([_id, count]) => ({ _id, count }));
  const byUrgency = Object.entries(byUrgencyMap).map(([_id, count]) => ({ _id, count }));

  return {
    byType,
    byStatus,
    byUrgency,
    totalIncidents: allIncidents.length,
    totalAlerts: alerts.size,
    totalResources: resources.size,
    totalUsers: 4, // Démo
    recentIncidents: allIncidents.slice(0, 5),
    timeline: [
      { date: '2026-09-03', count: 3 },
      { date: '2026-09-04', count: 5 },
      { date: '2026-09-05', count: 2 },
      { date: '2026-09-06', count: 7 },
      { date: '2026-09-07', count: 4 },
      { date: '2026-09-08', count: 6 },
      { date: '2026-09-09', count: allIncidents.length },
    ],
  };
};
