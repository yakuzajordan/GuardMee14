# GuardMee - Schéma MongoDB

## Collection: `users`

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Identifiant unique |
| `name` | String | Nom complet |
| `email` | String | Email (unique, sparse) |
| `phone` | String | Téléphone +237 (unique, sparse) |
| `password` | String | Mot de passe hashé (bcrypt) |
| `role` | Enum | citoyen, moderateur, agent, admin |
| `avatar` | String | URL photo de profil |
| `defaultLocation` | GeoJSON Point | Localisation par défaut |
| `isPhoneVerified` | Boolean | Téléphone vérifié par SMS |
| `isEmailVerified` | Boolean | Email vérifié |
| `twoFactorEnabled` | Boolean | 2FA activé |
| `twoFactorSecret` | String | Secret TOTP |
| `authProvider` | Enum | local, facebook, whatsapp |
| `credibilityScore` | Number | Score 0-100 |
| `isActive` | Boolean | Compte actif |
| `alertRadius` | Number | Rayon d'alerte (mètres) |
| `preferences` | Object | pushNotifications, smsAlerts, emailAlerts |
| `createdAt` / `updatedAt` | Date | Horodatage |

**Index:** `defaultLocation` (2dsphere), `role`, `email`, `phone`

---

## Collection: `incidents`

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Identifiant unique |
| `type` | Enum | agression, accident, incendie, inondation, coupure, vol, danger_sanitaire |
| `description` | String | Description libre |
| `location` | GeoJSON Point | [longitude, latitude] |
| `urgency` | Enum | faible, moyen, eleve, critique |
| `riskCategory` | String | Catégorie auto (sécurité, catastrophe, etc.) |
| `reporter` | ObjectId → User | Signaleur (null si anonyme) |
| `isAnonymous` | Boolean | Signalement anonyme |
| `media` | Array | Photos/vidéos Cloudinary + métadonnées GPS |
| `status` | Enum | en_attente, valide, rejete, info_requise, en_cours, resolu |
| `credibilityScore` | Number | Score de crédibilité |
| `moderationNotes` | String | Notes du modérateur |
| `moderatedBy` | ObjectId → User | Modérateur |
| `assignedAgent` | ObjectId → User | Agent assigné |
| `intervention` | Object | Statut intervention (en_route, sur_place, etc.) |
| `offlineId` | String | ID local pour sync hors-ligne |

**Index:** `location` (2dsphere), `type+status+createdAt`, `urgency`

---

## Collection: `alerts`

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Identifiant unique |
| `incident` | ObjectId → Incident | Incident lié |
| `title` | String | Titre de l'alerte |
| `message` | String | Message |
| `severity` | Enum | info, attention, urgence, critique |
| `targetArea` | GeoJSON Point + radius | Zone ciblée |
| `channels` | Object | push, sms, email, securityChannel |
| `createdBy` | ObjectId → User | Créateur |
| `isActive` | Boolean | Alerte active |
| `expiresAt` | Date | Expiration |
| `recipientCount` | Number | Nombre de destinataires |

**Index:** `targetArea` (2dsphere), `isActive+createdAt`

---

## Collection: `resources`

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Identifiant unique |
| `name` | String | Nom de la ressource |
| `type` | Enum | equipe, vehicule, materiel |
| `description` | String | Description |
| `location` | GeoJSON Point | Position actuelle |
| `status` | Enum | disponible, en_mission, maintenance, indisponible |
| `capacity` | Number | Capacité |
| `assignedIncident` | ObjectId → Incident | Incident assigné |
| `managedBy` | ObjectId → User | Gestionnaire |
| `contactPhone` | String | Contact |
| `metadata` | Object | plaque, équipement, taille équipe |

**Index:** `location` (2dsphere), `status+type`

---

## Collection: `notifications`

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Identifiant unique |
| `user` | ObjectId → User | Destinataire |
| `type` | Enum | incident_proche, alerte_zone, moderation, intervention, systeme, message_agent |
| `title` | String | Titre |
| `message` | String | Contenu |
| `data` | Object | incidentId, alertId, link |
| `isRead` | Boolean | Lu / non lu |
| `channel` | Enum | push, sms, email, in_app |
| `sentAt` | Date | Date d'envoi |

**Index:** `user+isRead+createdAt`

---

## Relations

```
User ──< Incident (reporter)
User ──< Incident (moderatedBy, assignedAgent)
User ──< Alert (createdBy)
User ──< Resource (managedBy)
User ──< Notification (user)
Incident ──< Alert (incident)
Incident ──< Resource (assignedIncident)
```
