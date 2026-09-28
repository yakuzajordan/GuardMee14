import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';
import { authAPI } from './api';

const syncWithBackend = async (firebaseUser, extra = {}) => {
  const idToken = await firebaseUser.getIdToken();
  const res = await authAPI.firebaseLogin({
    idToken,
    name: extra.name || firebaseUser.displayName,
    phone: extra.phone,
  });
  localStorage.setItem('guardmee_token', res.data.token);
  localStorage.setItem('guardmee_user', JSON.stringify(res.data.user));
  return res.data;
};

export const loginWithGoogle = async () => {
  if (!isFirebaseConfigured()) throw new Error('Firebase non configuré');
  const result = await signInWithPopup(auth, googleProvider);
  return syncWithBackend(result.user);
};

export const loginWithEmail = async (email, password) => {
  if (!isFirebaseConfigured()) throw new Error('Firebase non configuré');
  const result = await signInWithEmailAndPassword(auth, email, password);
  return syncWithBackend(result.user);
};

export const registerWithEmail = async (name, email, password) => {
  if (!isFirebaseConfigured()) throw new Error('Firebase non configuré');
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  return syncWithBackend(result.user, { name });
};

let recaptchaVerifier = null;

export const initPhoneRecaptcha = (containerId = 'recaptcha-container') => {
  if (!isFirebaseConfigured()) return null;
  if (recaptchaVerifier) recaptchaVerifier.clear();
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
  return syncWithBackend(result.user, { name, phone: result.user.phoneNumber });
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
