# MediConsult API Backend

Backend pour l'application MediConsult, fournissant une API RESTful pour la gestion des rendez-vous médicaux, patients et médecins.

## Fonctionnalités

- Authentification JWT pour patients et médecins
- Gestion des rendez-vous médicaux
- Système de paiement (Stripe)
- Gestion des profils utilisateurs
- API sécurisée avec validation de données

## Prérequis

- Node.js (v16.x ou supérieur)
- MongoDB (v4.x ou supérieur)
- npm ou yarn

## Installation

1. Cloner le dépôt
2. Installer les dépendances :

```bash
cd backend
npm install
```

3. Configuration des variables d'environnement :

```bash
cp .env.example .env
# Éditer le fichier .env avec vos configurations
```

4. Démarrer le serveur :

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

Le serveur sera accessible à l'adresse : http://localhost:5000

## Structure du projet

```
backend/
├── config/          # Configuration (DB, logger, etc.)
├── controllers/     # Contrôleurs pour les routes API
├── middlewares/     # Middlewares (auth, validation, etc.)
├── models/          # Modèles Mongoose
├── routes/          # Définitions des routes API
├── services/        # Services métier
├── utils/           # Utilitaires
├── uploads/         # Stockage des fichiers
├── logs/            # Logs d'application
└── server.js        # Point d'entrée
```

## API Endpoints

### Authentification

- `POST /api/auth/patient/register` - Inscription patient
- `POST /api/auth/patient/login` - Connexion patient
- `POST /api/auth/doctor/register` - Inscription médecin
- `POST /api/auth/doctor/login` - Connexion médecin

### Patients

- `GET /api/patients/:id` - Récupérer un profil patient
- `PUT /api/patients/:id` - Mettre à jour un profil patient
- `GET /api/patients/:id/appointments` - Rendez-vous d'un patient

### Médecins

- `GET /api/doctors` - Liste des médecins
- `GET /api/doctors/:id` - Profil d'un médecin
- `PUT /api/doctors/:id` - Mettre à jour un profil médecin
- `GET /api/doctors/:id/availability` - Disponibilités d'un médecin
- `POST /api/doctors/:id/availability` - Ajouter des disponibilités

### Rendez-vous

- `POST /api/appointments` - Créer un rendez-vous
- `GET /api/appointments/:id` - Détails d'un rendez-vous
- `PUT /api/appointments/:id` - Mettre à jour un rendez-vous
- `DELETE /api/appointments/:id` - Annuler un rendez-vous

## Tests

```bash
npm test
```

## Licence

MIT 