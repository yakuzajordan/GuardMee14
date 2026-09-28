# GuardMee 🛡️

**Plateforme communautaire de signalement et d'alerte en temps réel des zones à risque au Cameroun.**

Interface en français, optimisée pour smartphones Android bas de gamme et connexions 3G/4G lentes.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Node.js + Express.js |
| Base de données | MongoDB (Mongoose) |
| Authentification | JWT + 2FA (TOTP) + SMS + **Firebase Auth** |
| Temps réel | Socket.io |
| Hébergement | **Firebase Hosting** |
| Notifications push | **Firebase Cloud Messaging (FCM)** |
| Cartographie | Leaflet.js + heatmap |
| Médias | Cloudinary |
| API Docs | Swagger UI |

---

## Prérequis

- **Node.js** 18+
- **MongoDB** 6+ (local ou [MongoDB Atlas](https://www.mongodb.com/atlas))
- Comptes optionnels : Twilio (SMS), Cloudinary (médias), **Firebase** (auth + hosting + push)

---

## Firebase (hébergement en ligne)

GuardMee intègre **Firebase** en mode hybride. Guide complet : **[FIREBASE.md](FIREBASE.md)**

```bash
# Configurer .env avec vos clés Firebase (voir FIREBASE.md)
npm run build
firebase login
firebase deploy --only hosting   # ou: npm run deploy
```

Fonctionnalités Firebase :
- **Hosting** — déploiement du frontend en ligne (`*.web.app`)
- **Auth** — Google, email, SMS +237
- **FCM** — notifications push même app fermée
- **Storage** — stockage médias (optionnel)

Le backend Express reste sur Railway/Render ; MongoDB sur Atlas.

---

## Installation

### 1. Cloner et installer les dépendances

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cp .env.example .env
```

### 2. Configurer l'environnement

**Backend** (`backend/.env`) :

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/guardmee
JWT_SECRET=votre_secret_jwt_tres_securise
CLIENT_URL=http://localhost:5173
DEV_MODE=true
```

**Frontend** (`.env`) :

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

> En mode `DEV_MODE=true`, les SMS sont simulés dans la console (pas besoin de Twilio).

### 3. Démarrer MongoDB

```bash
# Windows (si installé en service)
net start MongoDB

# Ou via Docker
docker run -d -p 27017:27017 --name guardmee-mongo mongo:7
```

### 4. Lancer l'application

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
npm run dev
```

- **Frontend** : http://localhost:5173
- **API** : http://localhost:5000/api
- **Swagger** : http://localhost:5000/api/docs

### 5. Initialiser les comptes de démo

Connectez-vous en tant qu'admin ou appelez l'endpoint :

```bash
curl -X POST http://localhost:5000/api/admin/seed
```

Comptes créés :
| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@guardmee.cm | Admin@123 |
| Agent | agent@guardmee.cm | Agent@123 |

---

## Structure du projet

```
guardmee/
├── backend/
│   ├── server.js              # Point d'entrée Express + Socket.io
│   ├── DATABASE_SCHEMA.md     # Schéma MongoDB
│   └── src/
│       ├── models/            # User, Incident, Alert, Resource, Notification
│       ├── routes/            # API REST
│       ├── middleware/        # Auth JWT, rôles, upload
│       ├── services/          # SMS, Cloudinary, crédibilité, 2FA
│       └── socket/            # WebSocket temps réel
├── src/
│   ├── components/            # Navbar, Carte, Layout...
│   ├── context/               # Auth + Socket
│   ├── pages/                 # Toutes les pages UI
│   ├── services/              # Client API Axios
│   └── utils/                 # Constantes, offline sync
└── README.md
```

---

## Pages de l'interface

| Route | Description | Rôle |
|-------|-------------|------|
| `/` | Accueil et documentation | Public |
| `/connexion` | Connexion JWT + 2FA | Public |
| `/inscription` | Inscription (+237) | Public |
| `/verification-sms` | Vérification SMS | Authentifié |
| `/dashboard` | Tableau de bord citoyen | Citoyen |
| `/signaler` | Formulaire de signalement | Authentifié |
| `/carte` | Carte interactive + heatmap | Public |
| `/agent` | Modération et interventions | Agent/Modérateur |
| `/admin` | Statistiques et gestion | Admin |

---

## API REST — Endpoints principaux

### Authentification (`/api/auth`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/register` | Inscription |
| POST | `/login` | Connexion |
| POST | `/verify-sms` | Vérification SMS |
| POST | `/resend-sms` | Renvoyer code SMS |
| POST | `/2fa/enable` | Activer 2FA |
| POST | `/2fa/confirm` | Confirmer 2FA |
| GET | `/me` | Profil courant |
| PUT | `/profile` | Mettre à jour le profil |
| POST | `/social` | Auth Facebook/WhatsApp |
| POST | `/firebase` | Connexion Firebase (Google, SMS, email) |
| PUT | `/fcm-token` | Enregistrer token push FCM |

### Incidents (`/api/incidents`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/` | Créer un signalement (multipart) |
| GET | `/` | Lister les incidents (filtres) |
| GET | `/heatmap` | Données heatmap |
| GET | `/mine` | Mes signalements |
| GET | `/:id` | Détail incident |
| POST | `/sync` | Sync hors-ligne |
| PUT | `/:id/intervention` | Mettre à jour intervention |

### Modération (`/api/moderation`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/pending` | Signalements en attente |
| PUT | `/:id/validate` | Valider |
| PUT | `/:id/reject` | Rejeter |
| PUT | `/:id/request-info` | Demander plus d'infos |

### Alertes (`/api/alerts`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Lister alertes |
| POST | `/` | Créer une alerte |
| PUT | `/:id/deactivate` | Désactiver |

### Ressources (`/api/resources`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Lister ressources |
| POST | `/` | Créer ressource |
| PUT | `/:id/assign` | Assigner à un incident |
| PUT | `/:id/status` | Changer statut |

### Notifications (`/api/notifications`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Mes notifications |
| PUT | `/:id/read` | Marquer comme lu |
| PUT | `/read-all` | Tout marquer lu |

### Admin (`/api/admin`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/stats` | Statistiques |
| GET | `/users` | Liste utilisateurs |
| PUT | `/users/:id/role` | Changer rôle |
| PUT | `/users/:id/status` | Activer/désactiver |
| GET/PUT | `/ai-rules` | Règles IA |
| POST | `/seed` | Données de démo |

> Documentation interactive complète : **http://localhost:5000/api/docs**

---

## Schéma MongoDB

Voir [backend/DATABASE_SCHEMA.md](backend/DATABASE_SCHEMA.md) pour le détail des 5 collections :
- **users** — Comptes et rôles
- **incidents** — Signalements géolocalisés
- **alerts** — Alertes de zone
- **resources** — Équipes, véhicules, matériel
- **notifications** — Notifications utilisateur

---

## Rôles utilisateurs

| Rôle | Permissions |
|------|-------------|
| **citoyen** | Signaler, consulter carte, recevoir alertes |
| **moderateur** | Valider/rejeter signalements |
| **agent** | Modération + interventions + ressources |
| **admin** | Gestion complète + statistiques + règles IA |

---

## Fonctionnalités clés

- ✅ Inscription email/téléphone (+237) avec vérification SMS
- ✅ JWT + authentification 2FA (TOTP)
- ✅ Signalement avec GPS, photos/vidéos, mode anonyme
- ✅ Carte Leaflet temps réel avec heatmap
- ✅ Notifications Socket.io géolocalisées
- ✅ Modération avec scoring de crédibilité anti-fausses alertes
- ✅ Espace agent : interventions et ressources
- ✅ Dashboard admin avec graphiques (Recharts)
- ✅ Mode hors-ligne avec synchronisation différée
- ✅ API REST documentée Swagger

---

## Charte visuelle

- **Rouge urgence** : `#E53E3E`
- **Bleu sécurité** : `#2B6CB0`
- Design mobile-first, interface en français

---

## Déploiement (production)

Pour une faible latence en Afrique centrale, hébergez sur :
- **Frontend** : Vercel, Netlify ou Cloudflare Pages
- **Backend** : Railway, Render, ou VPS (DigitalOcean Frankfurt/Lagos)
- **MongoDB** : Atlas cluster `af-south-1` (Cape Town) ou `eu-west-1`

Configurez les variables d'environnement de production et désactivez `DEV_MODE`.

---

## Licence

MIT — Projet GuardMee © 2026
