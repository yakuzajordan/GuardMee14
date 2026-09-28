import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['equipe', 'vehicule', 'materiel'], required: true },
    description: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: String,
    },
    status: {
      type: String,
      enum: ['disponible', 'en_mission', 'maintenance', 'indisponible'],
      default: 'disponible',
    },
    capacity: { type: Number, default: 1 },
    assignedIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contactPhone: String,
    metadata: {
      plateNumber: String,
      equipment: [String],
      teamSize: Number,
    },
  },
  { timestamps: true }
);

resourceSchema.index({ location: '2dsphere' });
resourceSchema.index({ status: 1, type: 1 });

export default mongoose.model('Resource', resourceSchema);
