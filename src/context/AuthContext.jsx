import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';
import * as firestoreDB from '../services/firestoreDB';
import { requestFCMPermission, listenForegroundMessages } from '../services/fcm';

const AuthContext = createContext(null);

const formatPhone = (identifier) => {
  const cleaned = identifier.replace(/\s/g, '');
  if (cleaned.startsWith('+237')) return cleaned;
  if (cleaned.startsWith('237')) return `+${cleaned}`;
  if (/^[6-9]\d{8}$/.test(cleaned)) return `+237${cleaned}`;
  return null;
};

const persistLocal = (uid, user) => {
  localStorage.setItem('guardmee_uid', uid);
  localStorage.setItem('guardmee_user', JSON.stringify(user));
};

const clearLocal = () => {
  localStorage.removeItem('guardmee_uid');
  localStorage.removeItem('guardmee_user');
  localStorage.removeItem('guardmee_token');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseEnabled] = useState(isFirebaseConfigured());

  useEffect(() => {
    if (!firebaseEnabled) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile = await firestoreDB.getUserProfile(firebaseUser.uid);
          if (!profile) {
            profile = await firestoreDB.createUserProfile(firebaseUser.uid, {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
              email: firebaseUser.email,
              isEmailVerified: firebaseUser.emailVerified,
            });
          }
          persistLocal(firebaseUser.uid, profile);
          setUser(profile);
        } catch {
          setUser(null);
          clearLocal();
        }
      } else {
        setUser(null);
        clearLocal();
      }
      setLoading(false);
    });

    return unsub;
  }, [firebaseEnabled]);

  useEffect(() => {
    if (!user || !firebaseEnabled) return;
    return listenForegroundMessages(() => {});
  }, [user, firebaseEnabled]);

  const login = useCallback(async (identifier, password) => {
    if (!firebaseEnabled) throw new Error('Firebase non configuré');

    let email = identifier;
    if (!identifier.includes('@')) {
      const phone = formatPhone(identifier);
      if (phone) {
        throw new Error('Utilisez le bouton "Connexion par SMS" pour vous connecter avec votre téléphone');
      }
    }

    const cred = await signInWithEmailAndPassword(auth, email, password);
    let profile = await firestoreDB.getUserProfile(cred.user.uid);
    if (!profile) {
      profile = await firestoreDB.createUserProfile(cred.user.uid, {
        name: cred.user.displayName || email.split('@')[0],
        email,
        isEmailVerified: cred.user.emailVerified,
      });
    }
    persistLocal(cred.user.uid, profile);
    setUser(profile);
    requestFCMPermission();
    return { user: profile };
  }, [firebaseEnabled]);

  const register = useCallback(async ({ name, email, phone, password }) => {
    if (!firebaseEnabled) throw new Error('Firebase non configuré');
    if (!email) throw new Error('Un email est requis pour l\'inscription');

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const formattedPhone = phone ? formatPhone(phone) : null;
    const profile = await firestoreDB.createUserProfile(cred.user.uid, {
      name,
      email,
      phone: formattedPhone,
      isEmailVerified: false,
    });

    persistLocal(cred.user.uid, profile);
    setUser(profile);
    requestFCMPermission();
    return { user: profile, requiresPhoneVerification: false };
  }, [firebaseEnabled]);

  const loginGoogle = useCallback(async () => {
    if (!firebaseEnabled) throw new Error('Firebase non configuré');
    const result = await signInWithPopup(auth, googleProvider);
    let profile = await firestoreDB.getUserProfile(result.user.uid);
    if (!profile) {
      profile = await firestoreDB.createUserProfile(result.user.uid, {
        name: result.user.displayName,
        email: result.user.email,
        avatar: result.user.photoURL || '',
        isEmailVerified: result.user.emailVerified,
      });
    }
    persistLocal(result.user.uid, profile);
    setUser(profile);
    requestFCMPermission();
    return { user: profile };
  }, [firebaseEnabled]);

  const setSession = useCallback((data) => {
    if (data?.user) {
      persistLocal(data.user._id || data.user.uid, data.user);
      setUser(data.user);
    }
  }, []);

  const logout = useCallback(async () => {
    if (firebaseEnabled) await signOut(auth);
    clearLocal();
    setUser(null);
  }, [firebaseEnabled]);

  const updateUser = useCallback(async (userData) => {
    const uid = localStorage.getItem('guardmee_uid');
    if (uid) {
      await firestoreDB.updateUserProfile(uid, userData);
      const updated = { ...user, ...userData };
      setUser(updated);
      localStorage.setItem('guardmee_user', JSON.stringify(updated));
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, loginGoogle, setSession, logout, updateUser,
      isAuthenticated: !!user, firebaseEnabled,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};
