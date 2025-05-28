const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const { sendAppointmentConfirmation } = require('../services/emailService');
const logger = require('../config/logger');

// @desc    Process payment for appointment
// @route   POST /api/payments/process
// @access  Private/Patient
exports.processPayment = async (req, res) => {
  try {
    const { appointmentId, paymentMethod, cardDetails, saveCard } = req.body;
    
    logger.info(`Traitement du paiement pour le rendez-vous ${appointmentId}`);
    
    // Validate the appointment ID
    if (!appointmentId) {
      return res.status(400).json({ message: 'L\'ID du rendez-vous est requis' });
    }
    
    // Check if the appointment exists
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor')
      .populate('patient')
      .populate('availability');
    
    if (!appointment) {
      logger.warn(`Rendez-vous ${appointmentId} non trouvé pour le paiement`);
      return res.status(404).json({ message: 'Rendez-vous non trouvé' });
    }
    
    // Check if the appointment belongs to the patient
    const patient = await Patient.findOne({ user: req.user._id });
    
    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    if (appointment.patient.toString() !== patient._id.toString()) {
      logger.warn(`L'utilisateur ${req.user._id} n'est pas autorisé à payer pour ce rendez-vous`);
      return res.status(403).json({ message: 'Non autorisé' });
    }
    
    // Check if the appointment has already been paid
    if (appointment.paymentStatus === 'completed') {
      logger.warn(`Le rendez-vous ${appointmentId} a déjà été payé`);
      return res.status(400).json({ message: 'Ce rendez-vous a déjà été payé' });
    }
    
    // Process the payment through the payment service
    const paymentData = {
      appointmentId,
      patientId: patient._id,
      amount: appointment.price,
      paymentMethod,
      cardDetails,
      saveCard
    };
    
    // Call the payment service to process the payment
    const paymentResult = await paymentService.processPayment(paymentData);
    
    // Send confirmation email
    try {
      await sendAppointmentConfirmation(
        appointment,
        appointment.doctor,
        patient
      );
    } catch (emailError) {
      logger.error(`Erreur lors de l'envoi de l'email de confirmation: ${emailError.message}`);
      // Continue despite email error
    }
    
    logger.info(`Paiement traité avec succès pour le rendez-vous ${appointmentId}`);
    
    res.status(200).json({
      message: 'Paiement traité avec succès',
      payment: paymentResult,
      appointment: {
        _id: appointment._id,
        doctor: appointment.doctor,
        date: appointment.availability.date,
        startTime: appointment.slotStartTime,
        endTime: appointment.slotEndTime,
        status: 'confirmed'
      }
    });
  } catch (error) {
    logger.error(`Erreur lors du traitement du paiement: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: error.message });
  }
};

// Alias pour compatibilité avec les anciennes routes
exports.createPayment = exports.processPayment;

// @desc    Get all payments for the logged-in patient
// @route   GET /api/payments/patient
// @access  Private/Patient
exports.getPatientPayments = async (req, res) => {
  try {
    logger.info(`Récupération des paiements pour le patient ${req.user._id}`);
    
    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });
    
    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    const payments = await Payment.find({ patient: patient._id })
      .populate({
        path: 'appointment',
        populate: [
          {
            path: 'doctor',
            select: 'full_name first_name last_name doctor_image specialization',
            populate: {
              path: 'specialization',
              select: 'name'
            }
          },
          { path: 'availability' }
        ]
      })
      .sort({ paymentDate: -1 });
    
    logger.info(`${payments.length} paiements récupérés pour le patient ${req.user._id}`);
    
    res.json(payments);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des paiements du patient: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all payments for the logged-in doctor
// @route   GET /api/payments/doctor
// @access  Private/Doctor
exports.getDoctorPayments = async (req, res) => {
  try {
    logger.info(`Récupération des paiements pour le médecin ${req.user._id}`);
    
    // Find the doctor
    const doctor = await Doctor.findOne({ user: req.user._id });
    
    if (!doctor) {
      logger.warn(`Profil médecin non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil médecin non trouvé' });
    }
    
    // Get all appointments for this doctor
    const appointments = await Appointment.find({ doctor: doctor._id });
    
    const appointmentIds = appointments.map(app => app._id);
    
    const payments = await Payment.find({ appointment: { $in: appointmentIds } })
      .populate({
        path: 'appointment',
        populate: [
          {
            path: 'patient',
            select: 'first_name last_name',
            populate: {
              path: 'user',
              select: 'fullName email'
            }
          },
          { path: 'availability' }
        ]
      })
      .sort({ paymentDate: -1 });
    
    logger.info(`${payments.length} paiements récupérés pour le médecin ${req.user._id}`);
    
    res.json(payments);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des paiements du médecin: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
exports.getPaymentById = async (req, res) => {
  try {
    const paymentId = req.params.id;
    logger.info(`Récupération du paiement ${paymentId}`);
    
    const payment = await Payment.findById(paymentId)
      .populate({
        path: 'appointment',
        populate: [
          {
            path: 'doctor',
            select: 'full_name first_name last_name doctor_image specialization',
            populate: {
              path: 'specialization',
              select: 'name'
            }
          },
          {
            path: 'patient',
            select: 'first_name last_name',
            populate: {
              path: 'user',
              select: 'fullName email'
            }
          },
          { path: 'availability' }
        ]
      });
    
    if (!payment) {
      logger.warn(`Paiement ${paymentId} non trouvé`);
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }
    
    // Check if the user is authorized to view this payment
    const isDoctor = req.user.role === 'Doctor' && payment.appointment.doctor.user.toString() === req.user._id.toString();
    const isPatient = req.user.role === 'Patient' && payment.appointment.patient.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    
    if (!isDoctor && !isPatient && !isAdmin) {
      logger.warn(`L'utilisateur ${req.user._id} n'est pas autorisé à voir ce paiement`);
      return res.status(403).json({ message: 'Non autorisé' });
    }
    
    logger.info(`Paiement ${paymentId} récupéré avec succès`);
    
    res.json(payment);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du paiement: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Refund a payment
// @route   POST /api/payments/:id/refund
// @access  Private
exports.refundPayment = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Une raison pour le remboursement est requise' });
    }
    
    logger.info(`Demande de remboursement du paiement ${paymentId} par l'utilisateur ${req.user._id}`);
    
    const payment = await Payment.findById(paymentId).populate('appointment');
    
    if (!payment) {
      logger.warn(`Paiement ${paymentId} non trouvé`);
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }
    
    // Check if the payment can be refunded
    if (payment.status === 'refunded') {
      logger.warn(`Tentative de remboursement d'un paiement déjà remboursé: ${paymentId}`);
      return res.status(400).json({ message: 'Ce paiement a déjà été remboursé' });
    }
    
    // Process the refund through the payment service
    const refundResult = await paymentService.processRefund(paymentId, req.user._id, reason);
    
    logger.info(`Paiement ${paymentId} remboursé avec succès`);
    
    res.status(200).json({
      message: 'Remboursement effectué avec succès',
      refund: refundResult
    });
  } catch (error) {
    logger.error(`Erreur lors du remboursement: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment receipt
// @route   GET /api/payments/:id/receipt
// @access  Private
exports.getPaymentReceipt = async (req, res) => {
  try {
    const paymentId = req.params.id;
    logger.info(`Génération du reçu pour le paiement ${paymentId}`);
    
    const payment = await Payment.findById(paymentId)
      .populate({
        path: 'appointment',
        populate: [
          {
            path: 'doctor',
            select: 'full_name first_name last_name doctor_image specialization',
            populate: {
              path: 'specialization',
              select: 'name'
            }
          },
          {
            path: 'patient',
            select: 'first_name last_name',
            populate: {
              path: 'user',
              select: 'fullName email'
            }
          },
          { path: 'availability' }
        ]
      });
    
    if (!payment) {
      logger.warn(`Paiement ${paymentId} non trouvé pour la génération du reçu`);
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }
    
    // Check if the user is authorized to view this payment receipt
    const isDoctor = req.user.role === 'Doctor' && payment.appointment.doctor.user.toString() === req.user._id.toString();
    const isPatient = req.user.role === 'Patient' && payment.appointment.patient.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    
    if (!isDoctor && !isPatient && !isAdmin) {
      logger.warn(`L'utilisateur ${req.user._id} n'est pas autorisé à voir ce reçu de paiement`);
      return res.status(403).json({ message: 'Non autorisé' });
    }
    
    // Format the appointment date and time
    const appointmentDate = payment.appointment.availability && payment.appointment.availability.date
      ? new Date(payment.appointment.availability.date).toLocaleDateString('fr-FR')
      : 'Date inconnue';
    
    // Format the doctor name
    const doctorName = payment.appointment.doctor.full_name || 
      `${payment.appointment.doctor.first_name || ''} ${payment.appointment.doctor.last_name || ''}`.trim() || 
      'Médecin inconnu';
    
    // Format the patient name
    const patientName = `${payment.appointment.patient.first_name || ''} ${payment.appointment.patient.last_name || ''}`.trim() || 
      payment.appointment.patient.user.fullName || 
      'Patient inconnu';
    
    // Generate receipt data
    const receipt = {
      receiptId: `R-${payment._id.toString().substr(-6).toUpperCase()}`,
      paymentId: payment._id,
      transactionId: payment.transactionId,
      paymentDate: new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('fr-FR'),
      paymentTime: new Date(payment.paymentDate || payment.createdAt).toLocaleTimeString('fr-FR'),
      amount: payment.amount,
      currency: 'EUR',
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      appointment: {
        id: payment.appointment._id,
        date: appointmentDate,
        time: `${payment.appointment.slotStartTime} - ${payment.appointment.slotEndTime}`,
        duration: `${payment.appointment.duration} minutes`
      },
      doctor: {
        name: doctorName,
        specialization: payment.appointment.doctor.specialization ? payment.appointment.doctor.specialization.name : 'Non spécifiée'
      },
      patient: {
        name: patientName,
        email: payment.appointment.patient.user.email
      }
    };
    
    logger.info(`Reçu généré pour le paiement ${paymentId}`);
    
    res.json(receipt);
  } catch (error) {
    logger.error(`Erreur lors de la génération du reçu: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer une intention de paiement pour Stripe
// @route   POST /api/payments/create-payment-intent
// @access  Private/Patient
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'eur', paymentMethod } = req.body;
    
    if (!amount) {
      return res.status(400).json({ message: 'Le montant est requis' });
    }
    
    logger.info(`Création d'une intention de paiement: ${amount} ${currency}`);
    
    // Utiliser le service de paiement
    const paymentIntent = await paymentService.createPaymentIntent({
      amount,
      currency,
      paymentMethod
    });
    
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convertir de centimes à l'unité
      currency: paymentIntent.currency
    });
  } catch (error) {
    logger.error(`Erreur lors de la création de l'intention de paiement: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
exports.getAllPayments = async (req, res) => {
  try {
    logger.info('Récupération de tous les paiements');
    
    const payments = await Payment.find({})
      .populate({
        path: 'appointment',
        populate: [
          {
            path: 'doctor',
            select: 'full_name first_name last_name',
            populate: {
              path: 'specialization',
              select: 'name'
            }
          },
          {
            path: 'patient',
            select: 'first_name last_name',
            populate: {
              path: 'user',
              select: 'email'
            }
          }
        ]
      })
      .sort({ paymentDate: -1 });
    
    logger.info(`${payments.length} paiements récupérés`);
    
    res.json(payments);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des paiements: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
}; 