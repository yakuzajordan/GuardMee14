import mongoose from 'mongoose';
import User from '../models/User.js';
import * as devStore from '../dev/devUserStore.js';
import { seedDevData } from '../dev/devDataStore.js';

export let useDevStore = false;

const seedMongoDevData = async () => {
  const adminExists = await User.findOne({ role: 'admin' });
  if (adminExists) return;

  await User.create({
    name: 'Administrateur',
    email: 'admin@guardmee.cm',
    phone: '+237670000001',
    password: 'Admin@123',
    role: 'admin',
    isPhoneVerified: true,
    isEmailVerified: true,
  });

  await User.create({
    name: 'Agent Sécurité',
    email: 'agent@guardmee.cm',
    phone: '+237670000002',
    password: 'Agent@123',
    role: 'agent',
    isPhoneVerified: true,
  });

  console.log('Comptes de démo créés:');
  console.log('  Admin → admin@guardmee.cm / Admin@123');
  console.log('  Agent → agent@guardmee.cm / Agent@123');
};

export const connectDB = async () => {
  if (useDevStore) return;

  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardmee';
  uri = uri.replace(/localhost/g, '127.0.0.1');

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`MongoDB connecté: ${conn.connection.host}`);
    if (process.env.DEV_MODE === 'true') await seedMongoDevData();
    return;
  } catch (error) {
    console.warn(`MongoDB local indisponible: ${error.message}`);
  }

  if (process.env.DEV_MODE === 'true') {
    console.warn('⚠️  Mode stockage local activé (données de démo prêtes)');
    useDevStore = true;
    await seedDevData();
    return;
  }

  console.error('Erreur MongoDB: impossible de se connecter');
  process.exit(1);
};

export const isUsingDevStore = () => useDevStore;

