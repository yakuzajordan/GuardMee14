export const SERVICE_ROUTING = {
  incendie: { code: 'pompiers', label: 'Pompiers', channel: 'pompiers' },
  accident: { code: 'samu', label: 'SAMU / Ambulance', channel: 'samu' },
  agression: { code: 'police', label: 'Police / Gendarmerie', channel: 'police' },
  vol: { code: 'police', label: 'Police / Gendarmerie', channel: 'police' },
  inondation: { code: 'pompiers', label: 'Pompiers', channel: 'pompiers' },
  coupure: { code: 'technique', label: 'Service technique municipal', channel: 'technique' },
  danger_sanitaire: { code: 'samu', label: 'SAMU / Santé publique', channel: 'samu' },
  foule: { code: 'police', label: 'Police / Gendarmerie', channel: 'police' },
  default: { code: 'agents', label: 'Agents de sécurité', channel: 'security' },
};

export const routeToService = (typeDetecte) => {
  const key = (typeDetecte || '').toLowerCase().replace(/\s/g, '_');
  if (SERVICE_ROUTING[key]) return SERVICE_ROUTING[key];

  const aliases = {
    feu: 'incendie',
    fire: 'incendie',
    violence: 'agression',
    ambulance: 'accident',
    medical: 'accident',
    infrastructure: 'coupure',
    sanitaire: 'danger_sanitaire',
  };
  const mapped = aliases[key] || key;
  return SERVICE_ROUTING[mapped] || SERVICE_ROUTING.default;
};

export const GRAVITY_MAP = {
  faible: 'faible',
  moyen: 'moyen',
  moyenne: 'moyen',
  eleve: 'eleve',
  élevé: 'eleve',
  elevee: 'eleve',
  critique: 'critique',
  critical: 'critique',
};

export const normalizeGravity = (g) =>
  GRAVITY_MAP[(g || '').toLowerCase()] || 'moyen';
