const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const logger = require('./config/logger');

// Routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const doctorsRoutes = require('./routes/doctors');
const patientsRoutes = require('./routes/patients');
const appointmentsRoutes = require('./routes/appointments');
const appointmentNotesRoutes = require('./routes/appointmentNotes');
const availabilityRoutes = require('./routes/availability');
const notificationsRoutes = require('./routes/notifications');
const paymentMethodsRoutes = require('./routes/paymentMethods');
const paymentsRoutes = require('./routes/payments');
const questionsRoutes = require('./routes/questions');
const specializationsRoutes = require('./routes/specializations');

// Configuration
dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dossier statique pour les uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connexion à la base de données
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/my-app-web', {
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
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/appointment-notes', appointmentNotesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/specializations', specializationsRoutes);

// Route de test API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API fonctionne correctement' });
});

// Gestion des erreurs 404
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  logger.error(`Erreur: ${err.message}`);
  res.status(err.status || 500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// Port d'écoute
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Serveur en écoute sur le port ${PORT}`);
});

module.exports = app; 