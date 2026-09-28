import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const loadEnv = () => {
  const envPath = resolve(root, '.env');
  const vars = {};
  if (!existsSync(envPath)) return vars;
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) vars[key.trim()] = rest.join('=').trim();
  });
  return vars;
};

const env = { ...process.env, ...loadEnv() };

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

const swContent = `/* GuardMee FCM Service Worker - généré automatiquement */
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(config, null, 2)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'GuardMee', {
    body: body || '',
    icon: '/guardmee-icon.svg',
    badge: '/guardmee-icon.svg',
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(clients.openWindow(link));
});
`;

const outPath = resolve(root, 'public', 'firebase-messaging-sw.js');
writeFileSync(outPath, swContent);
console.log('✓ firebase-messaging-sw.js généré');
