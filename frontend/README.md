# MediConsult Frontend Web

Interface web pour l'application MediConsult, développée avec React et Vite.

## Fonctionnalités

- Interface utilisateur moderne et réactive
- Authentification pour patients et médecins
- Prise de rendez-vous médicaux en ligne
- Gestion des profils utilisateurs
- Tableau de bord personnalisé pour patients et médecins
- Thème clair/sombre

## Prérequis

- Node.js (v16.x ou supérieur)
- npm ou yarn

## Installation

1. Installer les dépendances :

```bash
cd frontend
npm install
```

2. Démarrer le serveur de développement :

```bash
npm run dev
```

L'application sera accessible à l'adresse : http://localhost:5173

## Structure du projet

```
frontend/
├── public/             # Fichiers statiques
├── src/
│   ├── assets/         # Images, fonts, etc.
│   ├── components/     # Composants UI réutilisables
│   ├── contexts/       # Contexts React (auth, notifications, etc.)
│   ├── hooks/          # Hooks personnalisés
│   ├── pages/          # Pages/Écrans de l'application
│   ├── services/       # Services pour API, auth, etc.
│   ├── styles/         # Styles globaux
│   ├── utils/          # Fonctions utilitaires
│   ├── App.tsx         # Composant racine
│   └── main.tsx        # Point d'entrée
├── index.html
├── package.json
└── vite.config.js      # Configuration Vite
```

## Technologies utilisées

- React 18+
- TypeScript
- Vite
- React Router 6
- Axios

## Scripts disponibles

- `npm run dev` : Démarre le serveur de développement
- `npm run build` : Construit l'application pour la production
- `npm run preview` : Prévisualise la version de production

## Licence

MIT
