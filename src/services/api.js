import * as db from './firestoreDB';
import { uploadMultipleMedia } from './storageService';
import { isFirebaseConfigured } from '../config/firebase';

// Helper: wrap Firestore results in the {data: ...} format that pages expect
const wrap = (data) => ({ data });

export const getApiErrorMessage = (err, fallback = 'Une erreur est survenue') => {
  if (!isFirebaseConfigured()) return 'Firebase non configuré. Ajoutez vos clés dans .env';
  return err?.message || fallback;
};

// ─── Auth API (handled via AuthContext, kept for VerifySMSPage compat) ─────────

export const authAPI = {
  verifySMS: async () => wrap({ success: true }),
  resendSMS: async () => wrap({ success: true }),
  saveFCMToken: async (token) => {
    const uid = localStorage.getItem('guardmee_uid');
    if (uid && token) await db.saveFCMTokenToFirestore(uid, token);
    return wrap({ success: true });
  },
};

// ─── Incidents ──────────────────────────────────────────────────────────────

export const incidentAPI = {
  create: async (formData) => {
    const uid = localStorage.getItem('guardmee_uid');
    const reporter = uid ? JSON.parse(localStorage.getItem('guardmee_user') || '{}') : null;

    const fields = {};
    if (formData instanceof FormData) {
      for (const [k, v] of formData.entries()) {
        if (k !== 'media') fields[k] = v;
      }
    } else {
      Object.assign(fields, formData);
    }

    const incident = await db.createIncident(fields, reporter?._id ? reporter : null);

    const mediaFiles = formData instanceof FormData ? formData.getAll('media') : [];
    if (mediaFiles.length > 0) {
      const uploaded = await uploadMultipleMedia(mediaFiles, incident._id);
      if (uploaded.length > 0) {
        await db.updateIncident(incident._id, { media: uploaded });
        incident.media = uploaded;
      }
    }

    return wrap({ success: true, incident });
  },

  list: async (params = {}) => {
    const result = await db.getIncidents(params);
    return wrap({ success: true, ...result });
  },

  get: async (id) => {
    const incident = await db.getIncident(id);
    if (!incident) throw new Error('Incident non trouvé');
    return wrap({ success: true, incident });
  },

  mine: async () => {
    const uid = localStorage.getItem('guardmee_uid');
    if (!uid) return wrap({ success: true, incidents: [] });
    const incidents = await db.getUserIncidents(uid);
    return wrap({ success: true, incidents });
  },

  heatmap: async (params = {}) => {
    const points = await db.getHeatmapPoints();
    return wrap({ success: true, points });
  },

  sync: async (incidents) => {
    const uid = localStorage.getItem('guardmee_uid');
    if (!uid) throw new Error('Non authentifié');
    const synced = await db.syncIncidents(incidents, uid);
    return wrap({ success: true, incidents: synced });
  },

  updateIntervention: async (id, data) => {
    const { status, notes, teamId } = data;
    const uid = localStorage.getItem('guardmee_uid');
    const updates = {
      intervention: { status, notes, teamId, startedAt: new Date().toISOString() },
      status: status === 'terminee' ? 'resolu' : 'en_cours',
      assignedAgentId: uid,
    };
    const incident = await db.updateIncident(id, updates);
    return wrap({ success: true, incident });
  },
};

// ─── Moderation ─────────────────────────────────────────────────────────────

export const moderationAPI = {
  pending: async (params = {}) => {
    const result = await db.getPendingIncidents(params);
    return wrap({ success: true, ...result });
  },

  validate: async (id, notes) => {
    const uid = localStorage.getItem('guardmee_uid');
    const incident = await db.updateIncident(id, {
      status: 'valide',
      moderationNotes: notes || '',
      moderatedById: uid,
      moderatedAt: new Date().toISOString(),
      validatedAt: new Date().toISOString(),
    });
    return wrap({ success: true, incident });
  },

  reject: async (id, reason) => {
    const uid = localStorage.getItem('guardmee_uid');
    const incident = await db.updateIncident(id, {
      status: 'rejete',
      moderationNotes: reason || '',
      moderatedById: uid,
      moderatedAt: new Date().toISOString(),
    });
    return wrap({ success: true, incident });
  },

  requestInfo: async (id, message) => {
    const uid = localStorage.getItem('guardmee_uid');
    const incident = await db.updateIncident(id, {
      status: 'info_requise',
      moderationNotes: message || '',
      moderatedById: uid,
      moderatedAt: new Date().toISOString(),
    });
    return wrap({ success: true, incident });
  },
};

// ─── Alerts ─────────────────────────────────────────────────────────────────

export const alertAPI = {
  list: async (params = {}) => {
    const alerts = await db.getAlerts(params);
    return wrap({ success: true, alerts });
  },

  create: async (data) => {
    const uid = localStorage.getItem('guardmee_uid');
    const alert = await db.createAlert(data, uid);
    return wrap({ success: true, alert });
  },

  deactivate: async (id) => {
    await db.deactivateAlert(id);
    return wrap({ success: true });
  },
};

// ─── Resources ──────────────────────────────────────────────────────────────

export const resourceAPI = {
  list: async (params = {}) => {
    const resources = await db.getResources(params);
    return wrap({ success: true, resources });
  },

  create: async (data) => {
    const user = JSON.parse(localStorage.getItem('guardmee_user') || '{}');
    const resource = await db.createResource(data, user._id, user.name);
    return wrap({ success: true, resource });
  },

  assign: async (id, incidentId) => {
    await db.updateResource(id, { assignedIncidentId: incidentId, status: 'en_mission' });
    return wrap({ success: true });
  },

  updateStatus: async (id, status) => {
    await db.updateResource(id, { status, assignedIncidentId: status === 'disponible' ? null : undefined });
    return wrap({ success: true });
  },
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const notificationAPI = {
  list: async () => {
    const uid = localStorage.getItem('guardmee_uid');
    if (!uid) return wrap({ notifications: [], unreadCount: 0 });
    const result = await db.getNotifications(uid);
    return wrap({ success: true, ...result });
  },

  markRead: async (id) => {
    const uid = localStorage.getItem('guardmee_uid');
    if (!uid) return wrap({ success: true });
    await db.markNotificationRead(uid, id);
    return wrap({ success: true });
  },

  markAllRead: async () => {
    const uid = localStorage.getItem('guardmee_uid');
    if (!uid) return wrap({ success: true });
    await db.markAllNotificationsRead(uid);
    return wrap({ success: true });
  },
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminAPI = {
  stats: async () => {
    const stats = await db.getAdminStats();
    return wrap({ success: true, stats });
  },

  users: async (params = {}) => {
    const result = await db.getUsers(params);
    return wrap({ success: true, ...result });
  },

  updateRole: async (id, role) => {
    await db.updateUserRole(id, role);
    return wrap({ success: true });
  },

  updateStatus: async (id, isActive) => {
    await db.updateUserStatus(id, isActive);
    return wrap({ success: true });
  },

  getAIRules: async () => {
    const rules = await db.getAIConfig();
    return wrap({ success: true, rules });
  },

  updateAIRules: async (rules) => {
    await db.saveAIConfig(rules);
    return wrap({ success: true, rules });
  },

  seed: async () => {
    const result = await db.seedDemoData();
    return wrap({ success: true, ...result });
  },
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const messageAPI = {
  list: async (incidentId) => {
    const messages = await db.getMessages(incidentId);
    return wrap({ success: true, messages });
  },

  send: async (incidentId, { text, senderId, senderName, senderRole }) => {
    const message = await db.sendMessage(incidentId, { text, senderId, senderName, senderRole });
    return wrap({ success: true, message });
  },

  subscribe: (incidentId, callback) => db.subscribeToMessages(incidentId, callback),
};

// ─── History (paginated) ─────────────────────────────────────────────────────

export const historyAPI = {
  list: async (params = {}) => {
    const uid = localStorage.getItem('guardmee_uid');
    if (!uid) return wrap({ success: true, incidents: [], total: 0 });
    const result = await db.getUserIncidentsPaginated(uid, params);
    return wrap({ success: true, ...result });
  },
};

export default { authAPI, incidentAPI, moderationAPI, alertAPI, resourceAPI, notificationAPI, adminAPI };
