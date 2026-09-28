import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { loginWithGoogle, logoutFirebase } from '../services/firebaseAuth';
import { requestFCMPermission, listenForegroundMessages } from '../services/fcm';
import { isFirebaseConfigured } from '../config/firebase';

const AuthContext = createContext(null);

const persistSession = (data) => {
  localStorage.setItem('guardmee_token', data.token);
  localStorage.setItem('guardmee_user', JSON.stringify(data.user));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('guardmee_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [firebaseEnabled] = useState(isFirebaseConfigured());

  useEffect(() => {
    const token = localStorage.getItem('guardmee_token');
    if (token) {
      authAPI.me()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('guardmee_user', JSON.stringify(res.data.user));
          if (firebaseEnabled) requestFCMPermission();
        })
        .catch(() => {
          localStorage.removeItem('guardmee_token');
          localStorage.removeItem('guardmee_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [firebaseEnabled]);

  useEffect(() => {
    if (!user || !firebaseEnabled) return;
    return listenForegroundMessages(() => {});
  }, [user, firebaseEnabled]);

  const login = useCallback(async (identifier, password, twoFactorCode) => {
    const res = await authAPI.login({ identifier, password, twoFactorCode });
    if (res.data.requires2FA) return res.data;
    persistSession(res.data);
    setUser(res.data.user);
    if (firebaseEnabled) await requestFCMPermission();
    return res.data;
  }, [firebaseEnabled]);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    persistSession(res.data);
    setUser(res.data.user);
    if (firebaseEnabled) await requestFCMPermission();
    return res.data;
  }, [firebaseEnabled]);

  const loginGoogle = useCallback(async () => {
    const data = await loginWithGoogle();
    setUser(data.user);
    if (firebaseEnabled) await requestFCMPermission();
    return data;
  }, [firebaseEnabled]);

  const setSession = useCallback((data) => {
    persistSession(data);
    setUser(data.user);
    if (firebaseEnabled) requestFCMPermission();
  }, [firebaseEnabled]);

  const logout = useCallback(async () => {
    await logoutFirebase();
    localStorage.removeItem('guardmee_token');
    localStorage.removeItem('guardmee_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('guardmee_user', JSON.stringify(userData));
  }, []);

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
