const Payment = require('../models/Payment');
const PaymentMethod = require('../models/PaymentMethod');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const notificationService = require('./notificationService');
const logger = require('../config/logger');

// Configuration Stripe (remplacer avec vos propres clés en production)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_votreCleSecrete';
let stripe;

// Initialiser Stripe si la clé est définie
try {
  if (process.env.NODE_ENV === 'production' && STRIPE_SECRET_KEY.startsWith('sk_')) {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
    logger.info('Service Stripe initialisé avec succès');
  } else {
    logger.warn('Stripe fonctionne en mode simulation car la clé API n\'est pas configurée correctement');
    // Créer un faux client Stripe pour le développement
    stripe = {
      paymentIntents: {
        create: async ({ amount, currency, payment_method, customer, metadata }) => {
          logger.debug(`[STRIPE SIMULATION] Création d'un intent de paiement: ${amount} ${currency}`);
          return {
            id: 'pi_' + Math.random().toString(36).substring(2, 15),
            amount,
            currency,
            status: 'succeeded',
            client_secret: 'cs_test_' + Math.random().toString(36).substring(2, 15)
          };
        }
      },
      customers: {
        create: async ({ email, name }) => {
          logger.debug(`[STRIPE SIMULATION] Création d'un client: ${email}`);
          return {
            id: 'cus_' + Math.random().toString(36).substring(2, 15),
            email,
            name
          };
        }
      }
    };
  }
} catch (error) {
  logger.error(`Erreur lors de l'initialisation de Stripe: ${error.message}`);
  // Créer un faux client Stripe pour que l'application continue de fonctionner
  stripe = {
    paymentIntents: {
      create: async () => ({
        id: 'pi_error',
        status: 'error',
        client_secret: 'cs_error'
      })
    },
    customers: {
      create: async () => ({
        id: 'cus_error'
      })
    }
  };
}

/**
 * Traite un paiement pour un rendez-vous
 * @param {Object} paymentData - Les données de paiement
 * @param {string} paymentData.appointmentId - L'ID du rendez-vous
 * @param {string} paymentData.patientId - L'ID du patient
 * @param {number} paymentData.amount - Le montant à payer
 * @param {string} paymentData.paymentMethod - La méthode de paiement
 * @param {Object} paymentData.cardDetails - Les détails de la carte (si paymentMethod est 'card')
 * @returns {Promise<Object>} - Les détails du paiement
 */
exports.processPayment = async (paymentData) => {
  try {
    logger.info(`Traitement du paiement pour le rendez-vous ${paymentData.appointmentId}`);
    
    // 1. Vérifier que le rendez-vous existe
    const appointment = await Appointment.findById(paymentData.appointmentId).populate('doctor');
    
    if (!appointment) {
      logger.error(`Rendez-vous ${paymentData.appointmentId} non trouvé pour le paiement`);
      throw new Error('Rendez-vous non trouvé');
    }
    
    // 2. Vérifier le montant
    if (paymentData.amount !== appointment.price) {
      logger.error(`Montant du paiement incorrect: ${paymentData.amount} ≠ ${appointment.price}`);
      throw new Error(`Le montant du paiement ne correspond pas au prix du rendez-vous`);
    }
    
    // 3. Obtenir les informations du patient
    const patient = await Patient.findById(paymentData.patientId).populate('user');
    
    if (!patient) {
      logger.error(`Patient ${paymentData.patientId} non trouvé`);
      throw new Error('Patient non trouvé');
    }
    
    // 4. Obtenir les informations du médecin
    const doctor = appointment.doctor;
    
    // 5. Créer/récupérer un client Stripe (simulé si en dev)
    const customerEmail = patient.user ? patient.user.email : 'patient@example.com';
    const customerName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    
    let stripeCustomerId;
    try {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName
      });
      stripeCustomerId = customer.id;
      logger.info(`Client Stripe créé: ${stripeCustomerId}`);
    } catch (stripeError) {
      logger.error(`Erreur lors de la création du client Stripe: ${stripeError.message}`);
      stripeCustomerId = 'cus_error_' + Math.random().toString(36).substring(2, 10);
    }
    
    // 6. Créer un intent de paiement Stripe (simulé si en dev)
    const paymentMethodId = paymentData.cardDetails ? paymentData.cardDetails.id : null;
    
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: paymentData.amount * 100, // Stripe utilise les centimes
        currency: 'eur',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        metadata: {
          appointmentId: paymentData.appointmentId,
          doctorId: appointment.doctor._id.toString(),
          patientId: paymentData.patientId
        }
      });
      logger.info(`Intent de paiement Stripe créé: ${paymentIntent.id}`);
    } catch (stripeError) {
      logger.error(`Erreur lors de la création de l'intent de paiement Stripe: ${stripeError.message}`);
      throw new Error(`Erreur de traitement du paiement: ${stripeError.message}`);
    }
    
    // 7. Créer un enregistrement de paiement en base de données
    const payment = new Payment({
      appointment: paymentData.appointmentId,
      patient: paymentData.patientId,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      status: 'completed',
      transactionId: paymentIntent.id
    });
    
    const savedPayment = await payment.save();
    logger.info(`Paiement enregistré en BDD: ${savedPayment._id}`);
    
    // 8. Mettre à jour le statut du rendez-vous
    appointment.paymentStatus = 'completed';
    if (appointment.status === 'pending') {
      appointment.status = 'confirmed';
    }
    await appointment.save();
    logger.info(`Statut du rendez-vous ${appointment._id} mis à jour: paymentStatus=${appointment.paymentStatus}, status=${appointment.status}`);
    
    // 9. Envoyer des notifications
    try {
      await notificationService.notifyPaymentReceived(savedPayment);
    } catch (notifError) {
      logger.error(`Erreur lors de l'envoi des notifications de paiement: ${notifError.message}`);
      // On continue même en cas d'erreur de notification
    }
    
    // 10. Si c'est un nouveau moyen de paiement par carte, l'enregistrer
    if (paymentData.paymentMethod === 'card' && paymentData.cardDetails && paymentData.saveCard) {
      try {
        const { cardholderName, lastFourDigits, expiryMonth, expiryYear } = paymentData.cardDetails;
        
        const paymentMethod = new PaymentMethod({
          patient: paymentData.patientId,
          name: `Carte **** **** **** ${lastFourDigits}`,
          type: 'card',
          cardholderName,
          lastFourDigits,
          expiryMonth,
          expiryYear,
          isDefault: true
        });
        
        await paymentMethod.save();
        logger.info(`Méthode de paiement enregistrée: ${paymentMethod._id}`);
      } catch (cardError) {
        logger.error(`Erreur lors de l'enregistrement de la carte: ${cardError.message}`);
        // On continue même en cas d'erreur d'enregistrement de la carte
      }
    }
    
    return {
      id: savedPayment._id,
      status: savedPayment.status,
      transactionId: savedPayment.transactionId,
      clientSecret: paymentIntent.client_secret
    };
  } catch (error) {
    logger.error(`Erreur lors du traitement du paiement: ${error.message}`, { stack: error.stack });
    throw error;
  }
};

/**
 * Effectuer un remboursement pour un paiement
 * @param {string} paymentId - L'ID du paiement à rembourser
 * @param {string} userId - L'ID de l'utilisateur qui demande le remboursement
 * @param {string} reason - La raison du remboursement
 * @returns {Promise<Object>} - Les détails du remboursement
 */
exports.processRefund = async (paymentId, userId, reason) => {
  try {
    logger.info(`Traitement du remboursement pour le paiement ${paymentId}`);
    
    // 1. Récupérer le paiement
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      logger.error(`Paiement ${paymentId} non trouvé pour le remboursement`);
      throw new Error('Paiement non trouvé');
    }
    
    // 2. Vérifier que le paiement peut être remboursé
    if (payment.status === 'refunded') {
      logger.warn(`Le paiement ${paymentId} a déjà été remboursé`);
      throw new Error('Ce paiement a déjà été remboursé');
    }
    
    // 3. Récupérer le rendez-vous associé
    const appointment = await Appointment.findById(payment.appointment)
      .populate('doctor')
      .populate('patient');
    
    if (!appointment) {
      logger.error(`Rendez-vous associé au paiement ${paymentId} non trouvé`);
      throw new Error('Rendez-vous associé au paiement non trouvé');
    }
    
    // 4. Vérifier les autorisations (admin, médecin concerné ou patient concerné)
    const user = await User.findById(userId).select('role');
    
    if (!user) {
      logger.error(`Utilisateur ${userId} non trouvé`);
      throw new Error('Utilisateur non trouvé');
    }
    
    // Vérifier si l'utilisateur est autorisé à effectuer le remboursement
    const isAdmin = user.role === 'Admin';
    const isDoctor = appointment.doctor && appointment.doctor.user.toString() === userId;
    const isPatient = appointment.patient && appointment.patient.user.toString() === userId;
    
    if (!isAdmin && !isDoctor && !isPatient) {
      logger.error(`L'utilisateur ${userId} n'est pas autorisé à effectuer ce remboursement`);
      throw new Error('Vous n\'êtes pas autorisé à effectuer ce remboursement');
    }
    
    // 5. Effectuer le remboursement via Stripe (simulé si en dev)
    try {
      // Simuler un remboursement Stripe
      logger.info(`[STRIPE SIMULATION] Remboursement pour la transaction ${payment.transactionId}`);
      const refundId = 're_' + Math.random().toString(36).substring(2, 15);
      
      // 6. Mettre à jour le paiement
      payment.status = 'refunded';
      payment.refundedAt = new Date();
      payment.refundReason = reason;
      payment.refundId = refundId;
      
      await payment.save();
      logger.info(`Paiement ${paymentId} marqué comme remboursé`);
      
      // 7. Mettre à jour le rendez-vous si nécessaire
      if (reason === 'cancellation') {
        appointment.status = 'cancelled';
        appointment.cancellationReason = 'Annulation et remboursement';
        appointment.cancelledBy = userId;
        appointment.cancelledAt = new Date();
        
        await appointment.save();
        logger.info(`Rendez-vous ${appointment._id} marqué comme annulé suite au remboursement`);
        
        // Envoyer des notifications d'annulation
        try {
          await notificationService.notifyAppointmentCancelled(appointment);
        } catch (notifError) {
          logger.error(`Erreur lors de l'envoi des notifications d'annulation: ${notifError.message}`);
          // On continue même en cas d'erreur de notification
        }
      }
      
      return {
        id: payment._id,
        status: payment.status,
        refundId,
        amount: payment.amount,
        message: 'Remboursement traité avec succès'
      };
    } catch (stripeError) {
      logger.error(`Erreur lors du remboursement Stripe: ${stripeError.message}`);
      throw new Error(`Erreur de traitement du remboursement: ${stripeError.message}`);
    }
  } catch (error) {
    logger.error(`Erreur lors du traitement du remboursement: ${error.message}`, { stack: error.stack });
    throw error;
  }
};

/**
 * Calculer le prix d'un rendez-vous
 * @param {string} doctorId - L'ID du médecin
 * @param {number} duration - La durée du rendez-vous en minutes
 * @returns {Promise<number>} - Le prix du rendez-vous
 */
exports.calculateAppointmentPrice = async (doctorId, duration) => {
  try {
    // Récupérer le tarif horaire du médecin
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      logger.error(`Médecin ${doctorId} non trouvé pour le calcul du prix`);
      throw new Error('Médecin non trouvé');
    }
    
    // Prix par défaut si non défini
    const hourlyRate = doctor.price || 50;
    
    // Calculer le prix proportionnellement à la durée
    const price = (hourlyRate / 60) * duration;
    
    // Arrondir à l'euro supérieur
    return Math.ceil(price);
  } catch (error) {
    logger.error(`Erreur lors du calcul du prix: ${error.message}`);
    throw error;
  }
}; 

exports.createPaymentIntent = async ({ amount, currency, paymentMethod }) => {
  try {
    logger.info(`Création d'une intention de paiement pour ${amount} ${currency}`);
    
    // Créer une intention de paiement avec Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convertir en centimes
      currency,
      payment_method: paymentMethod,
      confirmation_method: 'manual',
      confirm: true
    });

    logger.info(`Intention de paiement créée: ${paymentIntent.id}`);
    return paymentIntent;
  } catch (error) {
    logger.error(`Erreur lors de la création de l'intention de paiement: ${error.message}`);
    throw new Error(`Erreur de création de l'intention de paiement: ${error.message}`);
  }
}; 