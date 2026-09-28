import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['info', 'attention', 'urgence', 'critique'], default: 'attention' },
    targetArea: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      radius: { type: Number, default: 5000 },
    },
    channels: {
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      securityChannel: { type: Boolean, default: false },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    expiresAt: Date,
    recipientCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

alertSchema.index({ targetArea: '2dsphere' });
alertSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.model('Alert', alertSchema);
