const Notification = require('../models/Notification');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const logger = require('../config/logger');

// Stockage en mémoire des tokens d'appareils (remplacé par la BD dans une version de production)
const deviceTokens = new Map();

// Enregistrer un token d'appareil pour un utilisateur
exports.registerDeviceToken = (userId, token) => {
  deviceTokens.set(userId.toString(), token);
  logger.debug(`Token d'appareil enregistré pour l'utilisateur ${userId}: ${token.substring(0, 10)}...`);
};

// Envoyer une notification à un utilisateur
exports.sendNotification = async (userId, title, message, data = {}) => {
  try {
    // Créer une notification en base de données
    const newNotification = new Notification({
      recipient: userId,
      title,
      message,
      data,
      read: false
    });

    await newNotification.save();
    logger.info(`Notification créée en BDD pour l'utilisateur ${userId}: ${title}`);

    // Récupérer le token de l'appareil (soit depuis la map de test, soit depuis la BD)
    let deviceToken = deviceTokens.get(userId.toString());
    
    if (!deviceToken) {
      const user = await User.findById(userId);
      if (user && user.deviceToken) {
        deviceToken = user.deviceToken;
      }
    }

    // Envoyer une notification push si un token est disponible
    if (deviceToken) {
      // Dans une implémentation réelle, nous utiliserions un service comme Firebase Cloud Messaging
      // Simulons ici l'envoi réussi
      logger.info(`Notification push envoyée à l'utilisateur ${userId} sur l'appareil ${deviceToken.substring(0, 10)}...`);
      return true;
    } else {
      logger.warn(`Pas de token d'appareil disponible pour l'utilisateur ${userId}`);
      return false;
    }
  } catch (error) {
    logger.error(`Erreur lors de l'envoi de notification à l'utilisateur ${userId}: ${error.message}`);
    return false;
  }
};

// Notifier la création d'un rendez-vous
exports.notifyAppointmentCreated = async (appointment) => {
  try {
    // Récupérer les détails du médecin et du patient
    const doctor = await Doctor.findById(appointment.doctor).populate('user');
    const patient = await Patient.findById(appointment.patient).populate('user');
    const availability = await appointment._id 
      ? Appointment.findById(appointment._id).populate('availability')
      : { availability: { date: new Date() } };

    if (!doctor || !doctor.user || !patient || !patient.user) {
      logger.error('Données manquantes pour l\'envoi de notification de création de rendez-vous');
      return;
    }

    const doctorName = doctor.full_name || `Dr. ${doctor.last_name || ''}`;
    const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    const appointmentDate = new Date(availability.availability.date).toLocaleDateString('fr-FR');
    const appointmentTime = appointment.slotStartTime;

    // Notification au médecin
    await this.sendNotification(
      doctor.user._id,
      'Nouveau rendez-vous',
      `${patientName} a pris rendez-vous avec vous le ${appointmentDate} à ${appointmentTime}`,
      { 
        type: 'new_appointment', 
        appointmentId: appointment._id.toString(),
        date: appointmentDate,
        time: appointmentTime
      }
    );

    // Notification au patient (uniquement si le paiement est complété)
    if (appointment.paymentStatus === 'completed') {
      await this.sendNotification(
        patient.user._id,
        'Rendez-vous confirmé',
        `Votre rendez-vous avec ${doctorName} le ${appointmentDate} à ${appointmentTime} est confirmé`,
        { 
          type: 'confirmed_appointment', 
          appointmentId: appointment._id.toString(),
          date: appointmentDate,
          time: appointmentTime
        }
      );
    }

    logger.info(`Notifications envoyées pour le rendez-vous ${appointment._id}`);
  } catch (error) {
    logger.error(`Erreur lors de l'envoi des notifications de création de rendez-vous: ${error.message}`);
  }
};

// Programmer des rappels de rendez-vous
exports.scheduleAppointmentReminders = async (appointment) => {
  try {
    // Dans une implémentation réelle, nous utiliserions une file d'attente ou un job scheduler
    // Ici, nous allons simplement simuler la programmation
    logger.info(`Rappels programmés pour le rendez-vous ${appointment._id}`);
    
    // Détails pour le journal uniquement
    const availability = await appointment._id 
      ? Appointment.findById(appointment._id).populate('availability')
      : { availability: { date: new Date() } };
    
    if (availability && availability.availability) {
      const appointmentDate = new Date(availability.availability.date);
      const oneDayBefore = new Date(appointmentDate);
      oneDayBefore.setDate(appointmentDate.getDate() - 1);
      
      logger.info(`Rappel à envoyer le ${oneDayBefore.toLocaleDateString('fr-FR')} pour le rendez-vous du ${appointmentDate.toLocaleDateString('fr-FR')}`);
    }
  } catch (error) {
    logger.error(`Erreur lors de la programmation des rappels: ${error.message}`);
  }
};

// Notifier une demande de reprogrammation
exports.notifyRescheduleRequest = async (appointmentId) => {
  try {
    // Récupérer les détails du rendez-vous
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor')
      .populate('patient')
      .populate('availability');
    
    if (!appointment) {
      logger.error(`Rendez-vous ${appointmentId} non trouvé pour l'envoi de notification de reprogrammation`);
      return;
    }
    
    // Récupérer les détails des utilisateurs
    const doctor = await Doctor.findById(appointment.doctor._id).populate('user');
    const patient = await Patient.findById(appointment.patient._id).populate('user');
    
    if (!doctor || !doctor.user || !patient || !patient.user) {
      logger.error(`Utilisateurs non trouvés pour le rendez-vous ${appointmentId}`);
      return;
    }
    
    const doctorName = doctor.full_name || `Dr. ${doctor.last_name || ''}`;
    const appointmentDate = new Date(appointment.availability.date).toLocaleDateString('fr-FR');
    const appointmentTime = appointment.slotStartTime;
    
    // Notification au patient
    await this.sendNotification(
      patient.user._id,
      'Demande de reprogrammation',
      `${doctorName} demande à reprogrammer votre rendez-vous du ${appointmentDate} à ${appointmentTime}`,
      { 
        type: 'reschedule_request', 
        appointmentId: appointment._id.toString(),
        date: appointmentDate,
        time: appointmentTime
      }
    );
    
    logger.info(`Notification de demande de reprogrammation envoyée au patient pour le rendez-vous ${appointmentId}`);
  } catch (error) {
    logger.error(`Erreur lors de l'envoi de la notification de demande de reprogrammation: ${error.message}`);
  }
};

// Notifier qu'un rendez-vous a été reprogrammé par le patient
exports.notifyAppointmentRescheduledByPatient = async (appointment, oldDate, oldTime) => {
  try {
    // Récupérer les détails du rendez-vous
    const fullAppointment = await Appointment.findById(appointment._id)
      .populate('doctor')
      .populate('patient')
      .populate('availability');
    
    if (!fullAppointment) {
      logger.error(`Rendez-vous ${appointment._id} non trouvé pour l'envoi de notification de reprogrammation`);
      return;
    }
    
    // Récupérer les détails des utilisateurs
    const doctor = await Doctor.findById(fullAppointment.doctor._id).populate('user');
    const patient = await Patient.findById(fullAppointment.patient._id).populate('user');
    
    if (!doctor || !doctor.user || !patient || !patient.user) {
      logger.error(`Utilisateurs non trouvés pour le rendez-vous ${appointment._id}`);
      return;
    }
    
    const doctorName = doctor.full_name || `Dr. ${doctor.last_name || ''}`;
    const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    const newDate = new Date(fullAppointment.availability.date).toLocaleDateString('fr-FR');
    const newTime = fullAppointment.slotStartTime;
    
    // Notification au médecin
    await this.sendNotification(
      doctor.user._id,
      'Rendez-vous reprogrammé',
      `${patientName} a reprogrammé son rendez-vous du ${oldDate} à ${oldTime} pour le ${newDate} à ${newTime}`,
      { 
        type: 'rescheduled', 
        appointmentId: appointment._id.toString(),
        oldDate,
        oldTime,
        newDate,
        newTime
      }
    );
    
    // Notification au patient
    await this.sendNotification(
      patient.user._id,
      'Rendez-vous reprogrammé',
      `Votre rendez-vous avec ${doctorName} a été reprogrammé pour le ${newDate} à ${newTime}`,
      { 
        type: 'rescheduled', 
        appointmentId: appointment._id.toString(),
        oldDate,
        oldTime,
        newDate,
        newTime
      }
    );
    
    logger.info(`Notifications de reprogrammation envoyées pour le rendez-vous ${appointment._id}`);
  } catch (error) {
    logger.error(`Erreur lors de l'envoi des notifications de reprogrammation: ${error.message}`);
  }
};

// Notifier que le paiement a été reçu
exports.notifyPaymentReceived = async (payment) => {
  try {
    // Récupérer les détails du paiement et du rendez-vous associé
    const fullPayment = await payment._id 
      ? payment.populate({
          path: 'appointment',
          populate: [
            { path: 'doctor' },
            { path: 'patient' },
            { path: 'availability' }
          ]
        })
      : payment;
    
    // Si le paiement n'a pas d'ID, c'est qu'il est nouveau et n'est pas encore en base
    const appointment = fullPayment._id ? fullPayment.appointment : await Appointment.findById(payment.appointment)
      .populate('doctor')
      .populate('patient')
      .populate('availability');
    
    if (!appointment) {
      logger.error(`Rendez-vous non trouvé pour l'envoi de notification de paiement`);
      return;
    }
    
    // Récupérer les détails des utilisateurs
    const doctor = await Doctor.findById(appointment.doctor._id).populate('user');
    const patient = await Patient.findById(appointment.patient._id).populate('user');
    
    if (!doctor || !doctor.user || !patient || !patient.user) {
      logger.error(`Utilisateurs non trouvés pour la notification de paiement`);
      return;
    }
    
    const doctorName = doctor.full_name || `Dr. ${doctor.last_name || ''}`;
    const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    const appointmentDate = new Date(appointment.availability.date).toLocaleDateString('fr-FR');
    const appointmentTime = appointment.slotStartTime;
    const amount = payment.amount;
    
    // Notification au médecin
    await this.sendNotification(
      doctor.user._id,
      'Paiement reçu',
      `${patientName} a effectué un paiement de ${amount}€ pour le rendez-vous du ${appointmentDate} à ${appointmentTime}`,
      { 
        type: 'payment_received', 
        appointmentId: appointment._id.toString(),
        paymentId: payment._id ? payment._id.toString() : 'nouveau',
        amount,
        date: appointmentDate,
        time: appointmentTime
      }
    );
    
    // Notification au patient
    await this.sendNotification(
      patient.user._id,
      'Paiement confirmé',
      `Votre paiement de ${amount}€ pour le rendez-vous avec ${doctorName} le ${appointmentDate} à ${appointmentTime} est confirmé`,
      { 
        type: 'payment_confirmed', 
        appointmentId: appointment._id.toString(),
        paymentId: payment._id ? payment._id.toString() : 'nouveau',
        amount,
        date: appointmentDate,
        time: appointmentTime
      }
    );
    
    logger.info(`Notifications de paiement envoyées pour le rendez-vous ${appointment._id}`);
  } catch (error) {
    logger.error(`Erreur lors de l'envoi des notifications de paiement: ${error.message}`);
  }
};

// Notifier qu'un rendez-vous a été annulé
exports.notifyAppointmentCancelled = async (appointment) => {
  try {
    // Récupérer les détails du rendez-vous
    const fullAppointment = await Appointment.findById(appointment._id)
      .populate('doctor')
      .populate('patient')
      .populate('availability');
    
    if (!fullAppointment) {
      logger.error(`Rendez-vous ${appointment._id} non trouvé pour l'envoi de notification d'annulation`);
      return;
    }
    
    // Récupérer les détails des utilisateurs
    const doctor = await Doctor.findById(fullAppointment.doctor._id).populate('user');
    const patient = await Patient.findById(fullAppointment.patient._id).populate('user');
    
    if (!doctor || !doctor.user || !patient || !patient.user) {
      logger.error(`Utilisateurs non trouvés pour le rendez-vous ${appointment._id}`);
      return;
    }
    
    const doctorName = doctor.full_name || `Dr. ${doctor.last_name || ''}`;
    const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    const appointmentDate = new Date(fullAppointment.availability.date).toLocaleDateString('fr-FR');
    const appointmentTime = fullAppointment.slotStartTime;
    
    // Notification au médecin
    await this.sendNotification(
      doctor.user._id,
      'Rendez-vous annulé',
      `${patientName} a annulé son rendez-vous du ${appointmentDate} à ${appointmentTime}`,
      { 
        type: 'cancelled', 
        appointmentId: appointment._id.toString(),
        date: appointmentDate,
        time: appointmentTime
      }
    );
    
    // Notification au patient
    await this.sendNotification(
      patient.user._id,
      'Rendez-vous annulé',
      `Votre rendez-vous avec ${doctorName} le ${appointmentDate} à ${appointmentTime} a été annulé`,
      { 
        type: 'cancelled', 
        appointmentId: appointment._id.toString(),
        date: appointmentDate,
        time: appointmentTime
      }
    );
    
    logger.info(`Notifications d'annulation envoyées pour le rendez-vous ${appointment._id}`);
  } catch (error) {
    logger.error(`Erreur lors de l'envoi des notifications d'annulation: ${error.message}`);
  }
}; 