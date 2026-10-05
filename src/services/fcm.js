import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, isFirebaseConfigured } from '../config/firebase';
import { saveFCMTokenToFirestore } from './firestoreDB';

export const requestFCMPermission = async () => {
  if (!isFirebaseConfigured()) return null;
  if (!('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    });

    if (token) {
      const uid = localStorage.getItem('guardmee_uid');
      if (uid) await saveFCMTokenToFirestore(uid, token);
    }
    return token;
  } catch (err) {
    console.warn('FCM token error:', err.message);
    return null;
  }
};

export const listenForegroundMessages = (callback) => {
  if (!isFirebaseConfigured()) return () => {};

  let unsubscribe = () => {};

  getFirebaseMessaging().then((messaging) => {
    if (!messaging) return;
    unsubscribe = onMessage(messaging, (payload) => {
      callback(payload);
      if (payload.notification && Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/guardmee-icon.svg',
        });
      }
    });
  });

  return () => unsubscribe();
};
