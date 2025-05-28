const crypto = require('crypto');
require('dotenv').config();

// Clés de chiffrement (à définir dans les variables d'environnement en production)
// En développement, utiliser des clés par défaut
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // Clé 32 octets pour AES-256
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || '0123456789abcdef'; // IV 16 octets pour AES

// Algorithme de chiffrement utilisé
const ALGORITHM = 'aes-256-cbc';

/**
 * Chiffre une chaîne de texte
 * @param {string} text - Texte à chiffrer
 * @returns {string} - Texte chiffré en base64
 */
function encrypt(text) {
  try {
    if (!text) return '';
    
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), ENCRYPTION_IV);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  } catch (error) {
    console.error('Erreur de chiffrement:', error.message);
    // En cas d'erreur, retourner une valeur vide mais loggée
    return '';
  }
}

/**
 * Déchiffre une chaîne de texte chiffrée
 * @param {string} encryptedText - Texte chiffré en base64
 * @returns {string} - Texte déchiffré
 */
function decrypt(encryptedText) {
  try {
    if (!encryptedText) return '';
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), ENCRYPTION_IV);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erreur de déchiffrement:', error.message);
    // En cas d'erreur, retourner une valeur vide mais loggée
    return '[Erreur de déchiffrement]';
  }
}

module.exports = {
  encrypt,
  decrypt
}; 