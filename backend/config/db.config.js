/**
 * Configuration de la base de données
 */

const mongoose = require('mongoose');
require('dotenv').config();

// URL de connexion à MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mediconsult';

// Options de connexion à MongoDB
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

/**
 * Établit la connexion à la base de données MongoDB
 * @returns {Promise} Promesse de connexion
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ Connexion à MongoDB établie avec succès');
    return mongoose.connection;
  } catch (err) {
    console.error('❌ Erreur de connexion à MongoDB:', err.message);
    process.exit(1);
  }
}

/**
 * Ferme la connexion à la base de données
 * @returns {Promise} Promesse de fermeture
 */
async function closeDB() {
  try {
    await mongoose.connection.close();
    console.log('Connexion à MongoDB fermée');
  } catch (err) {
    console.error('Erreur lors de la fermeture de la connexion:', err.message);
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  closeDB,
  mongoose
}; 