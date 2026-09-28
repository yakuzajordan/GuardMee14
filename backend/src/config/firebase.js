import admin from 'firebase-admin';

let initialized = false;

export const isFirebaseAdminConfigured = () =>
  Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL);

export const initFirebaseAdmin = () => {
  if (initialized || !isFirebaseAdminConfigured()) return null;

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    initialized = true;
    console.log('Firebase Admin initialisé');
    return admin;
  } catch (error) {
    console.warn('Firebase Admin non initialisé:', error.message);
    return null;
  }
};

export const getFirebaseAdmin = () => {
  if (!initialized) initFirebaseAdmin();
  return initialized ? admin : null;
};

export const verifyFirebaseToken = async (idToken) => {
  const fb = getFirebaseAdmin();
  if (!fb) throw new Error('Firebase Admin non configuré');
  return fb.auth().verifyIdToken(idToken);
};
