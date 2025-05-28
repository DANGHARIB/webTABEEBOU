import api from './api';

/**
 * Service de gestion des paiements pour l'application web
 */

/**
 * Transformer les données de paiement de l'API vers le format de l'interface utilisateur
 * @param {Object} apiPayment - Paiement provenant de l'API
 * @returns {Object} - Paiement formaté pour l'UI
 */
const transformPaymentData = (apiPayment) => {
  return {
    id: apiPayment._id,
    amount: apiPayment.amount || 0,
    date: apiPayment.paymentDate || apiPayment.createdAt,
    status: apiPayment.status || 'pending',
    method: apiPayment.paymentMethod,
    methodDisplay: formatPaymentMethod(apiPayment.paymentMethod),
    description: apiPayment.appointment?.caseDetails || 'Consultation',
    
    // Relations
    doctor: apiPayment.appointment?.doctor ? {
      id: apiPayment.appointment.doctor._id,
      name: apiPayment.appointment.doctor.full_name || 
        `${apiPayment.appointment.doctor.first_name || ''} ${apiPayment.appointment.doctor.last_name || ''}`.trim()
    } : null,
    
    patient: apiPayment.patient ? {
      id: apiPayment.patient._id,
      name: `${apiPayment.patient.first_name || ''} ${apiPayment.patient.last_name || ''}`.trim()
    } : null,
    
    appointment: apiPayment.appointment ? {
      id: apiPayment.appointment._id,
      date: apiPayment.appointment.availability?.date,
      time: apiPayment.appointment.slotStartTime
    } : null,
    
    // Métadonnées
    transactionId: apiPayment.transactionId,
    createdAt: apiPayment.createdAt,
    updatedAt: apiPayment.updatedAt,
    
    // Données originales
    _original: apiPayment
  };
};

/**
 * Formater la méthode de paiement pour l'affichage
 * @param {string} method - Code de la méthode de paiement
 * @returns {string} - Nom d'affichage de la méthode
 */
const formatPaymentMethod = (method) => {
  const methods = {
    'card': 'Carte bancaire',
    'paypal': 'PayPal',
    'apple_pay': 'Apple Pay',
    'google_pay': 'Google Pay'
  };
  
  return methods[method] || method || 'Carte bancaire';
};

const paymentsService = {
  /**
   * Récupérer tous les paiements d'un patient (pour l'utilisateur connecté)
   * @returns {Promise<Array>} Liste des paiements transformés
   */
  getPatientPayments: async () => {
    try {
      const response = await api.get('/payments/patient');
      return response.data.map(transformPaymentData);
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error);
      throw error;
    }
  },
  
  /**
   * Récupérer tous les paiements d'un médecin (pour l'utilisateur connecté)
   * @returns {Promise<Array>} Liste des paiements transformés
   */
  getDoctorPayments: async () => {
    try {
      const response = await api.get('/payments/doctor');
      return response.data.map(transformPaymentData);
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error);
      throw error;
    }
  },
  
  /**
   * Récupérer les détails d'un paiement spécifique
   * @param {string} paymentId - ID du paiement
   * @returns {Promise<Object>} Détails du paiement transformé
   */
  getPaymentDetails: async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}`);
      return transformPaymentData(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du paiement:', error);
      throw error;
    }
  },
  
  /**
   * Créer un nouveau paiement
   * @param {Object} paymentData - Données du paiement
   * @returns {Promise<Object>} Paiement créé transformé
   */
  createPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments', paymentData);
      return transformPaymentData(response.data);
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error);
      throw error;
    }
  },
  
  /**
   * Traiter un paiement avec Stripe
   * @param {Object} paymentData - Données du paiement
   * @returns {Promise<Object>} Résultat du traitement
   */
  processStripePayment: async (paymentData) => {
    try {
      const response = await api.post('/payments/process-stripe', paymentData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du traitement du paiement Stripe:', error);
      throw error;
    }
  },
  
  /**
   * Demander un remboursement
   * @param {string} paymentId - ID du paiement à rembourser
   * @param {Object} refundData - Données du remboursement (raison, montant, etc.)
   * @returns {Promise<Object>} Résultat du remboursement
   */
  requestRefund: async (paymentId, refundData) => {
    try {
      const response = await api.post(`/payments/${paymentId}/refund`, refundData);
      return transformPaymentData(response.data);
    } catch (error) {
      console.error('Erreur lors de la demande de remboursement:', error);
      throw error;
    }
  },
  
  /**
   * Récupérer les méthodes de paiement enregistrées
   * @returns {Promise<Array>} Liste des méthodes de paiement
   */
  getSavedPaymentMethods: async () => {
    try {
      const response = await api.get('/payment-methods');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des méthodes de paiement:', error);
      throw error;
    }
  },
  
  /**
   * Ajouter une nouvelle méthode de paiement
   * @param {Object} methodData - Données de la méthode de paiement
   * @returns {Promise<Object>} Méthode de paiement créée
   */
  addPaymentMethod: async (methodData) => {
    try {
      const response = await api.post('/payment-methods', methodData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la méthode de paiement:', error);
      throw error;
    }
  },
  
  /**
   * Supprimer une méthode de paiement
   * @param {string} methodId - ID de la méthode de paiement
   * @returns {Promise<Object>} Résultat de la suppression
   */
  deletePaymentMethod: async (methodId) => {
    try {
      const response = await api.delete(`/payment-methods/${methodId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression de la méthode de paiement:', error);
      throw error;
    }
  }
};

export default paymentsService;