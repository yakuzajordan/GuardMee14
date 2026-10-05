import {
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';
import * as firestoreDB from './firestoreDB';

const syncProfile = async (firebaseUser, extra = {}) => {
  let profile = await firestoreDB.getUserProfile(firebaseUser.uid);
  if (!profile) {
    profile = await firestoreDB.createUserProfile(firebaseUser.uid, {
      name: extra.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
      email: firebaseUser.email,
      phone: extra.phone || firebaseUser.phoneNumber,
      avatar: firebaseUser.photoURL || '',
      isEmailVerified: firebaseUser.emailVerified,
      isPhoneVerified: !!firebaseUser.phoneNumber,
    });
  } else {
    const updates = { updatedAt: new Date().toISOString() };
    if (extra.name) updates.name = extra.name;
    if (firebaseUser.photoURL && !profile.avatar) updates.avatar = firebaseUser.photoURL;
    await firestoreDB.updateUserProfile(firebaseUser.uid, updates);
    profile = { ...profile, ...updates };
  }
  localStorage.setItem('guardmee_uid', firebaseUser.uid);
  localStorage.setItem('guardmee_user', JSON.stringify(profile));
  return { user: profile };
};

export const loginWithGoogle = async () => {
  if (!isFirebaseConfigured()) throw new Error('Firebase non configuré');
  const result = await signInWithPopup(auth, googleProvider);
  return syncProfile(result.user);
};

let recaptchaVerifier = null;

export const initPhoneRecaptcha = (containerId = 'recaptcha-container') => {
  if (!isFirebaseConfigured()) return null;
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch { /* ignore */ }
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
  });
  return recaptchaVerifier;
};

export const loginWithPhone = async (phoneNumber) => {
  if (!isFirebaseConfigured()) throw new Error('Firebase non configuré');
  if (!recaptchaVerifier) initPhoneRecaptcha();
  const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+237${phoneNumber}`;
  return signInWithPhoneNumber(auth, formatted, recaptchaVerifier);
};

export const confirmPhoneCode = async (confirmationResult, code, name) => {
  const result = await confirmationResult.confirm(code);
  return syncProfile(result.user, { name, phone: result.user.phoneNumber });
};

export const logoutFirebase = async () => {
  if (isFirebaseConfigured() && auth?.currentUser) {
    await signOut(auth);
  }
};

export const getFirebaseIdToken = async () => {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
};
