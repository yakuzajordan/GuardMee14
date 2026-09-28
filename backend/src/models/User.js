import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: /^\+237[6-9]\d{8}$/,
    },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: ['citoyen', 'moderateur', 'agent', 'admin'],
      default: 'citoyen',
    },
    avatar: { type: String, default: '' },
    defaultLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [11.5021, 3.848] }, // Yaoundé
      address: { type: String, default: 'Yaoundé, Cameroun' },
    },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    smsCode: { type: String, select: false },
    smsCodeExpires: { type: Date, select: false },
    authProvider: {
      type: String,
      enum: ['local', 'facebook', 'whatsapp', 'google', 'firebase', 'phone'],
      default: 'local',
    },
    providerId: { type: String },
    firebaseUid: { type: String, unique: true, sparse: true },
    fcmTokens: { type: [String], default: [] },
    credibilityScore: { type: Number, default: 50, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    alertRadius: { type: Number, default: 5000 }, // mètres
    preferences: {
      pushNotifications: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: true },
    },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ 'defaultLocation.coordinates': '2dsphere' });
userSchema.index({ role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.smsCode;
  delete obj.smsCodeExpires;
  delete obj.fcmTokens;
  return obj;
};

export default mongoose.model('User', userSchema);
