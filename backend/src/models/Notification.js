import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'incident_proche',
        'alerte_zone',
        'moderation',
        'intervention',
        'systeme',
        'message_agent',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: {
      incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
      alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert' },
      link: String,
    },
    isRead: { type: Boolean, default: false },
    channel: { type: String, enum: ['push', 'sms', 'email', 'in_app'], default: 'in_app' },
    sentAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
