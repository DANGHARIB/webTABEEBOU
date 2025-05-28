/**
 * MediConsult API Server
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const hpp = require('hpp');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const logger = require('./config/logger');
const cron = require('node-cron');
const { exec } = require('child_process');

// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express
const app = express();

// Configuration CORS pour autoriser les requêtes du frontend
const corsOptions = {
  origin: [
    'http://localhost:5173', // URL de développement Vite (par défaut)
    'http://localhost:4173', // URL de prévisualisation Vite (build)
    'https://votre-domaine-web.com', // URL de production
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet()); // Sécurité
app.use(compression()); // Compression
app.use(hpp()); // Protection contre la pollution des paramètres HTTP

// Logger en développement
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', { stream: logger.stream }));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Middleware pour capturer et logger les erreurs
app.use((req, res, next) => {
  // Capturer les erreurs de parsing JSON
  const originalJson = res.json;
  res.json = function(body) {
    if (res.statusCode >= 400) {
      logger.error(`Réponse d'erreur: ${res.statusCode} ${JSON.stringify(body)}`);
    }
    return originalJson.call(this, body);
  };
  next();
});

// Dossier pour les uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connexion à la base de données
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mediconsult', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info('Connexion à MongoDB établie avec succès');
})
.catch((error) => {
  logger.error(`Erreur de connexion à MongoDB: ${error.message}`);
});

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/specializations', require('./routes/specializations'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/payment-methods', require('./routes/paymentMethods'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/appointment-notes', require('./routes/appointmentNotes'));

// Route de test API
app.get('/api/status', (req, res) => {
  res.json({ message: 'API MediConsult fonctionnelle', status: 'online', version: '1.0.0' });
});

// Gestion des erreurs 404
app.use((req, res, next) => {
  logger.warn(`Route non trouvée: ${req.method} ${req.originalUrl}`);
  
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({ message: 'Route non trouvée' });
  } else {
    next();
  }
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  logger.error(`Erreur: ${err.message}`, { stack: err.stack });
  
  if (req.originalUrl.startsWith('/api')) {
    // Réponse JSON pour les API
    res.status(err.statusCode || 500).json({
      message: err.message || 'Erreur interne du serveur',
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
  } else {
    // Pour une éventuelle interface web directe
    res.status(err.statusCode || 500).send(`
      <html>
        <head><title>Erreur</title></head>
        <body>
          <h1>Une erreur est survenue</h1>
          <p>${process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message}</p>
          ${process.env.NODE_ENV === 'production' ? '' : `<pre>${err.stack}</pre>`}
        </body>
      </html>
    `);
  }
});

// Programmer la tâche de nettoyage des rendez-vous non payés
// Exécution toutes les heures
const CLEANUP_ENABLED = process.env.ENABLE_CLEANUP === 'true' || false;

if (CLEANUP_ENABLED) {
  cron.schedule('0 * * * *', () => {
    logger.info('Lancement du nettoyage des rendez-vous non payés');
    exec('node scripts/cleanupUnpaidAppointments.js', (error, stdout, stderr) => {
      if (error) {
        logger.error(`Erreur d'exécution du script de nettoyage: ${error.message}`);
        return;
      }
      if (stderr) {
        logger.error(`Erreur dans le script de nettoyage: ${stderr}`);
        return;
      }
      logger.info(`Résultat du nettoyage: ${stdout}`);
    });
  });
}

// Port et démarrage du serveur
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
  logger.info(`Serveur démarré sur le port ${PORT} en environnement ${process.env.NODE_ENV || 'développement'}`);
});

module.exports = app;
