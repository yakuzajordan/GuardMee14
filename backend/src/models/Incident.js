import mongoose from 'mongoose';

export const INCIDENT_TYPES = [
  'agression',
  'accident',
  'incendie',
  'inondation',
  'coupure',
  'vol',
  'danger_sanitaire',
];

export const URGENCY_LEVELS = ['faible', 'moyen', 'eleve', 'critique'];
export const INCIDENT_STATUS = [
  'en_attente',
  'valide',
  'rejete',
  'info_requise',
  'en_cours',
  'resolu',
];

const mediaSchema = new mongoose.Schema({
  url: String,
  publicId: String,
  type: { type: String, enum: ['image', 'video'] },
  thumbnail: String,
  metadata: {
    latitude: Number,
    longitude: Number,
    capturedAt: Date,
  },
});

const incidentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: INCIDENT_TYPES, required: true },
    description: { type: String, required: true, maxlength: 2000 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
      address: String,
    },
    urgency: { type: String, enum: URGENCY_LEVELS, default: 'moyen' },
    riskCategory: { type: String },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isAnonymous: { type: Boolean, default: false },
    media: [mediaSchema],
    status: { type: String, enum: INCIDENT_STATUS, default: 'en_attente' },
    credibilityScore: { type: Number, default: 50 },
    moderationNotes: String,
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: Date,
    validatedAt: Date,
    resolvedAt: Date,
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    intervention: {
      startedAt: Date,
      teamId: String,
      notes: String,
      status: { type: String, enum: ['non_demarree', 'en_route', 'sur_place', 'terminee'], default: 'non_demarree' },
    },
    offlineId: { type: String, sparse: true },
    syncedAt: Date,
    isLiveStream: { type: Boolean, default: false },
    analyse_ia: {
      type_detecte: String,
      gravite: { type: String, enum: URGENCY_LEVELS },
      description: String,
      confidence: { type: Number, min: 0, max: 1 },
      provider: String,
      analysedAt: Date,
    },
    routedService: {
      code: String,
      label: String,
      notifiedAt: Date,
    },
  },
  { timestamps: true }
);

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ type: 1, status: 1, createdAt: -1 });
incidentSchema.index({ urgency: 1 });

incidentSchema.statics.categorizeRisk = function (type) {
  const map = {
    agression: 'securite_personnes',
    accident: 'securite_routiere',
    incendie: 'catastrophe',
    inondation: 'catastrophe',
    coupure: 'infrastructure',
    vol: 'securite_biens',
    danger_sanitaire: 'sante_publique',
  };
  return map[type] || 'autre';
};

incidentSchema.statics.urgencyFromType = function (type) {
  const map = {
    agression: 'eleve',
    accident: 'eleve',
    incendie: 'critique',
    inondation: 'eleve',
    coupure: 'faible',
    vol: 'moyen',
    danger_sanitaire: 'eleve',
  };
  return map[type] || 'moyen';
};

export default mongoose.model('Incident', incidentSchema);
