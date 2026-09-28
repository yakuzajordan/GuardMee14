import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const users = new Map();

const toPublic = (user) => {
  const { password, smsCode, twoFactorSecret, fcmTokens, ...rest } = user;
  return rest;
};

export const seedDevUsers = async () => {
  if (users.size > 0) return;

  const admin = {
    _id: uuidv4(),
    name: 'Administrateur',
    email: 'admin@guardmee.cm',
    phone: '+237670000001',
    password: await bcrypt.hash('Admin@123', 12),
    role: 'admin',
    isPhoneVerified: true,
    isEmailVerified: true,
    isActive: true,
    credibilityScore: 50,
    authProvider: 'local',
    twoFactorEnabled: false,
    preferences: { pushNotifications: true, smsAlerts: true, emailAlerts: true },
  };

  const agent = {
    _id: uuidv4(),
    name: 'Agent Sécurité',
    email: 'agent@guardmee.cm',
    phone: '+237670000002',
    password: await bcrypt.hash('Agent@123', 12),
    role: 'agent',
    isPhoneVerified: true,
    isActive: true,
    credibilityScore: 50,
    authProvider: 'local',
    twoFactorEnabled: false,
    preferences: { pushNotifications: true, smsAlerts: true, emailAlerts: true },
  };

  users.set(admin.email, admin);
  users.set(agent.email, agent);
  users.set(admin.phone, admin);
  users.set(agent.phone, agent);

  console.log('Comptes de démo (mode local):');
  console.log('  Admin → admin@guardmee.cm / Admin@123');
  console.log('  Agent → agent@guardmee.cm / Agent@123');
};

export const findByIdentifier = (identifier) => {
  const key = identifier.toLowerCase();
  if (users.has(key)) return users.get(key);
  if (users.has(identifier)) return users.get(identifier);
  for (const u of users.values()) {
    if (u.email === key || u.phone === identifier) return u;
  }
  return null;
};

export const findByEmail = (email) => users.get(email?.toLowerCase()) || null;
export const findByPhone = (phone) => users.get(phone) || null;
export const findById = (id) => {
  for (const u of users.values()) {
    if (u._id === id) return u;
  }
  return null;
};

export const createUser = async ({ name, email, phone, password, authProvider = 'local' }) => {
  const user = {
    _id: uuidv4(),
    name,
    email: email?.toLowerCase(),
    phone,
    password: password ? await bcrypt.hash(password, 12) : undefined,
    role: 'citoyen',
    isPhoneVerified: false,
    isEmailVerified: false,
    isActive: true,
    credibilityScore: 50,
    authProvider,
    twoFactorEnabled: false,
    preferences: { pushNotifications: true, smsAlerts: true, emailAlerts: true },
  };

  if (email) users.set(user.email, user);
  if (phone) users.set(phone, user);
  return user;
};

export const comparePassword = (user, candidate) => bcrypt.compare(candidate, user.password);

export const toPublicJSON = (user) => toPublic(user);

export const isDevStoreActive = () => users.size >= 0;
