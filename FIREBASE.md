# Configuration Firebase pour GuardMee

## 1. Créer le projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Créez un projet **GuardMee**
3. Activez **Google Analytics** (optionnel)

## 2. Configurer l'application Web

1. **Ajouter une application** → Web (icône `</>`)
2. Copiez la config dans `.env` à la racine :

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=guardmee-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=guardmee-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=guardmee-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 3. Activer l'authentification

Dans **Authentication → Sign-in method**, activez :
- **Email/Password**
- **Google**
- **Phone** (+237 Cameroun supporté)

Pour le téléphone, ajoutez votre domaine dans **Authorized domains** :
- `localhost`
- `votre-projet.web.app` (après déploiement Hosting)

## 4. Configurer Cloud Messaging (FCM)

1. **Project Settings → Cloud Messaging**
2. Onglet **Web Push certificates** → Générer une paire de clés
3. Copiez la clé dans `.env` :

```env
VITE_FIREBASE_VAPID_KEY=BExxx...
```

## 5. Configurer Firebase Admin (backend)

1. **Project Settings → Service accounts**
2. **Generate new private key** → téléchargez le JSON
3. Ajoutez dans `backend/.env` :

```env
FIREBASE_PROJECT_ID=guardmee-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@guardmee-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=guardmee-xxxxx.appspot.com
```

## 6. Activer Firebase Storage (optionnel)

1. **Storage → Get started**
2. Règles recommandées pour les médias d'incidents :

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /incidents/{incidentId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 7. Déployer le frontend (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # sélectionnez votre projet
# Modifiez .firebaserc avec votre project ID

npm run build        # génère dist/ + firebase-messaging-sw.js
firebase deploy --only hosting
```

URL de production : `https://votre-projet.web.app`

## 8. Variables de production

Créez `.env.production` :

```env
VITE_API_URL=https://votre-api.railway.app/api
VITE_SOCKET_URL=https://votre-api.railway.app
VITE_FIREBASE_API_KEY=...
# ... autres clés Firebase
```

Puis `npm run build && firebase deploy --only hosting`

## Architecture hybride

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Firebase Hosting│────▶│ Backend Express  │────▶│   MongoDB Atlas │
│  (React build)  │     │ Railway/Render   │     │                 │
└────────┬────────┘     └────────┬─────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Firebase Auth  │     │  Firebase Admin  │
│ Google/SMS/Email│     │  FCM push notifs │
└─────────────────┘     └──────────────────┘
```

## Fonctionnalités Firebase intégrées

| Fonctionnalité | Fichier(s) |
|----------------|------------|
| Config Firebase | `src/config/firebase.js` |
| Auth Google/SMS | `src/services/firebaseAuth.js` |
| Push notifications | `src/services/fcm.js` + `public/firebase-messaging-sw.js` |
| Sync backend | `POST /api/auth/firebase` |
| Enregistrement FCM | `PUT /api/auth/fcm-token` |
| Push serveur | `backend/src/services/fcm.js` |
| Hosting | `firebase.json` |

## Mode sans Firebase

L'application fonctionne sans configuration Firebase :
- Auth classique JWT + SMS Twilio (mode dev)
- Pas de boutons Google/SMS Firebase
- Pas de push FCM (Socket.io reste actif)
