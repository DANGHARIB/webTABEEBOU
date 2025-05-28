# MediConsult - Application Web pour la Gestion de Rendez-vous Médicaux

MediConsult est une application web complète pour la gestion des rendez-vous médicaux, permettant aux patients de trouver des médecins et de prendre rendez-vous en ligne, et aux médecins de gérer leur calendrier et leurs patients.

## Structure du projet

Ce projet est organisé en deux parties principales :

```
my-app-web/
├── backend/         # API backend (Node.js/Express/MongoDB)
└── frontend/        # Interface utilisateur web (React/Vite)
```

## Installation et configuration

### Prérequis

- Node.js (v16.x ou supérieur)
- MongoDB (v4.x ou supérieur)
- npm ou yarn

### Backend (API)

1. Installer les dépendances :

```bash
cd backend
npm install
```

2. Configurer les variables d'environnement :

```bash
cp .env.example .env
# Éditer le fichier .env avec vos configurations
```

3. Démarrer le serveur backend :

```bash
npm run dev
```

Le backend sera accessible à l'adresse : http://localhost:5000

### Frontend (Interface Web)

1. Installer les dépendances :

```bash
cd frontend
npm install
```

2. Démarrer le serveur de développement :

```bash
npm run dev
```

L'interface web sera accessible à l'adresse : http://localhost:5173

## Principales fonctionnalités

### Pour les patients

- Création de compte et authentification
- Recherche de médecins par spécialité/localisation
- Prise de rendez-vous en ligne
- Gestion des rendez-vous (annulation, reprogrammation)
- Paiement en ligne des consultations
- Historique médical

### Pour les médecins

- Gestion du profil et des disponibilités
- Tableau de bord des rendez-vous
- Gestion des patients
- Notes médicales et prescriptions
- Suivi des revenus

## Technologies utilisées

### Backend
- Node.js
- Express.js
- MongoDB
- JWT pour l'authentification
- Mongoose

### Frontend
- React
- TypeScript
- Vite
- React Router
- Axios

## Licence

MIT 