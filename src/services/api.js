import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const isAuthRequest = (url = '') =>
  url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/firebase');

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('guardmee_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isAuthRequest(err.config?.url)) {
      localStorage.removeItem('guardmee_token');
      localStorage.removeItem('guardmee_user');
      if (!window.location.pathname.includes('/connexion')) {
        window.location.href = '/connexion';
      }
    }
    return Promise.reject(err);
  }
);

export const getApiErrorMessage = (err, fallback = 'Une erreur est survenue') => {
  if (!err.response) {
    return 'Serveur inaccessible. Démarrez le backend : cd backend && npm run dev';
  }
  return err.response?.data?.message || err.message || fallback;
};

export default api;

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  verifySMS: (code) => api.post('/auth/verify-sms', { code }),
  resendSMS: () => api.post('/auth/resend-sms'),
  updateProfile: (data) => api.put('/auth/profile', data),
  enable2FA: () => api.post('/auth/2fa/enable'),
  confirm2FA: (code) => api.post('/auth/2fa/confirm', { code }),
  socialLogin: (data) => api.post('/auth/social', data),
  firebaseLogin: (data) => api.post('/auth/firebase', data),
  saveFCMToken: (token) => api.put('/auth/fcm-token', { token }),
};

export const incidentAPI = {
  create: (formData) => api.post('/incidents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (params) => api.get('/incidents', { params }),
  get: (id) => api.get(`/incidents/${id}`),
  mine: () => api.get('/incidents/mine'),
  heatmap: (params) => api.get('/incidents/heatmap', { params }),
  sync: (incidents) => api.post('/incidents/sync', { incidents }),
  updateIntervention: (id, data) => api.put(`/incidents/${id}/intervention`, data),
};

export const moderationAPI = {
  pending: (params) => api.get('/moderation/pending', { params }),
  validate: (id, notes) => api.put(`/moderation/${id}/validate`, { notes }),
  reject: (id, reason) => api.put(`/moderation/${id}/reject`, { reason }),
  requestInfo: (id, message) => api.put(`/moderation/${id}/request-info`, { message }),
};

export const alertAPI = {
  list: (params) => api.get('/alerts', { params }),
  create: (data) => api.post('/alerts', data),
  deactivate: (id) => api.put(`/alerts/${id}/deactivate`),
};

export const resourceAPI = {
  list: (params) => api.get('/resources', { params }),
  create: (data) => api.post('/resources', data),
  assign: (id, incidentId) => api.put(`/resources/${id}/assign`, { incidentId }),
  updateStatus: (id, status) => api.put(`/resources/${id}/status`, { status }),
};

export const notificationAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const adminAPI = {
  stats: (params) => api.get('/admin/stats', { params }),
  users: (params) => api.get('/admin/users', { params }),
  updateRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  updateStatus: (id, isActive) => api.put(`/admin/users/${id}/status`, { isActive }),
  getAIRules: () => api.get('/admin/ai-rules'),
  updateAIRules: (rules) => api.put('/admin/ai-rules', rules),
  seed: () => api.post('/admin/seed'),
};
