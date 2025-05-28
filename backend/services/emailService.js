const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Configuration du transporteur d'emails
let transporter;

// Initialiser le transporteur d'emails pour le développement ou la production
if (process.env.NODE_ENV === 'production') {
  // En production, utiliser un vrai service d'emails
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'user@example.com',
      pass: process.env.EMAIL_PASS || 'password'
    }
  });
  logger.info('Service d\'emails configuré pour la production');
} else {
  // En développement, utiliser Ethereal pour simuler les emails
  (async () => {
    try {
      // Créer un compte de test Ethereal
      let testAccount = await nodemailer.createTestAccount();
      
      // Créer un transporteur réutilisable qui utilisera SMTP avec Ethereal
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      logger.info('Service d\'emails configuré pour le développement (Ethereal)');
      logger.debug(`Compte de test Ethereal créé: ${testAccount.user}`);
    } catch (error) {
      logger.error(`Erreur lors de la création du compte de test Ethereal: ${error.message}`);
      // Créer un faux transporteur pour éviter les erreurs
      transporter = {
        sendMail: async (mailOptions) => {
          logger.info(`[EMAIL SIMULATION] Email à ${mailOptions.to}: ${mailOptions.subject}`);
          return { messageId: 'simulated_id' };
        },
        verify: async () => true
      };
    }
  })();
}

// Vérifier la connexion SMTP
const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    logger.info('Connexion SMTP vérifiée avec succès');
    return true;
  } catch (error) {
    logger.error(`Erreur de connexion SMTP: ${error.message}`);
    return false;
  }
};

// Templates d'emails
const templates = {
  otp: (code) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Vérification de votre compte</h2>
      <p>Votre code de vérification est: <strong>${code}</strong></p>
      <p>Ce code est valide pendant 15 minutes.</p>
      <p>Si vous n'avez pas demandé ce code, veuillez ignorer cet email ou contactez notre support.</p>
      <p>Merci de votre confiance,</p>
      <p>L'équipe Tabeebou</p>
    </div>
  `,
  
  welcomeDoctor: (name) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Bienvenue sur Tabeebou, Dr. ${name}</h2>
      <p>Merci d'avoir rejoint notre plateforme de télémédecine.</p>
      <p>Votre compte est actuellement en cours de vérification par notre équipe. Ce processus peut prendre jusqu'à 48 heures ouvrables.</p>
      <p>Vous recevrez une notification dès que votre profil sera validé et que vous pourrez commencer à consulter.</p>
      <p>Merci de votre patience,</p>
      <p>L'équipe Tabeebou</p>
    </div>
  `,
  
  appointmentConfirmation: (appointment, doctor, patient) => {
    const appointmentDate = new Date(appointment.date).toLocaleDateString('fr-FR');
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Confirmation de rendez-vous</h2>
        <p>Votre rendez-vous avec Dr. ${doctor.full_name} le ${appointmentDate} à ${appointment.slotStartTime} est confirmé.</p>
        <p><strong>Informations du rendez-vous:</strong></p>
        <ul>
          <li>Date: ${appointmentDate}</li>
          <li>Heure: ${appointment.slotStartTime} - ${appointment.slotEndTime}</li>
          <li>Durée: ${appointment.duration} minutes</li>
          <li>Médecin: Dr. ${doctor.full_name}</li>
          <li>Patient: ${patient.first_name} ${patient.last_name}</li>
          <li>Montant payé: ${appointment.price} €</li>
        </ul>
        <p>Le lien de connexion à la consultation vous sera envoyé 15 minutes avant le début du rendez-vous.</p>
        <p>Merci de votre confiance,</p>
        <p>L'équipe Tabeebou</p>
      </div>
    `;
  },
  
  appointmentZoomLink: (appointment, doctor, patient, zoomLink) => {
    const appointmentDate = new Date(appointment.date).toLocaleDateString('fr-FR');
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Votre consultation va bientôt commencer</h2>
        <p>Votre rendez-vous avec Dr. ${doctor.full_name} le ${appointmentDate} à ${appointment.slotStartTime} va bientôt débuter.</p>
        <p><strong>Cliquez sur le lien ci-dessous pour rejoindre la consultation:</strong></p>
        <p style="text-align: center;">
          <a href="${zoomLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Rejoindre la consultation
          </a>
        </p>
        <p>Ou copiez ce lien dans votre navigateur: ${zoomLink}</p>
        <p>Assurez-vous que votre caméra et votre microphone fonctionnent correctement avant de rejoindre la consultation.</p>
        <p>L'équipe Tabeebou</p>
      </div>
    `;
  },
  
  appointmentReminder: (appointment, doctor, patient) => {
    const appointmentDate = new Date(appointment.date).toLocaleDateString('fr-FR');
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Rappel de rendez-vous</h2>
        <p>Nous vous rappelons que vous avez un rendez-vous demain avec Dr. ${doctor.full_name} le ${appointmentDate} à ${appointment.slotStartTime}.</p>
        <p><strong>Informations du rendez-vous:</strong></p>
        <ul>
          <li>Date: ${appointmentDate}</li>
          <li>Heure: ${appointment.slotStartTime} - ${appointment.slotEndTime}</li>
          <li>Durée: ${appointment.duration} minutes</li>
          <li>Médecin: Dr. ${doctor.full_name}</li>
        </ul>
        <p>Le lien de connexion à la consultation vous sera envoyé 15 minutes avant le début du rendez-vous.</p>
        <p>Si vous souhaitez annuler ou reprogrammer ce rendez-vous, veuillez le faire au moins 2 heures à l'avance.</p>
        <p>L'équipe Tabeebou</p>
      </div>
    `
  },
  
  appointmentCancelled: (appointment, doctor, patient, cancelledBy) => {
    const appointmentDate = new Date(appointment.date).toLocaleDateString('fr-FR');
    const canceller = cancelledBy === 'doctor' ? 'le médecin' : 'le patient';
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Annulation de rendez-vous</h2>
        <p>Votre rendez-vous du ${appointmentDate} à ${appointment.slotStartTime} a été annulé par ${canceller}.</p>
        <p><strong>Détails du rendez-vous annulé:</strong></p>
        <ul>
          <li>Date: ${appointmentDate}</li>
          <li>Heure: ${appointment.slotStartTime} - ${appointment.slotEndTime}</li>
          <li>Médecin: Dr. ${doctor.full_name}</li>
          <li>Patient: ${patient.first_name} ${patient.last_name}</li>
        </ul>
        <p>Si un paiement a été effectué, il sera remboursé sous 5 à 7 jours ouvrables.</p>
        <p>L'équipe Tabeebou</p>
      </div>
    `
  },
  
  appointmentRescheduled: (appointment, oldDate, oldTime, doctor, patient) => {
    const appointmentDate = new Date(appointment.date).toLocaleDateString('fr-FR');
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Rendez-vous reprogrammé</h2>
        <p>Votre rendez-vous initialement prévu le ${oldDate} à ${oldTime} a été reprogrammé au ${appointmentDate} à ${appointment.slotStartTime}.</p>
        <p><strong>Nouvelles informations du rendez-vous:</strong></p>
        <ul>
          <li>Date: ${appointmentDate}</li>
          <li>Heure: ${appointment.slotStartTime} - ${appointment.slotEndTime}</li>
          <li>Durée: ${appointment.duration} minutes</li>
          <li>Médecin: Dr. ${doctor.full_name}</li>
          <li>Patient: ${patient.first_name} ${patient.last_name}</li>
        </ul>
        <p>Le lien de connexion à la consultation vous sera envoyé 15 minutes avant le début du rendez-vous.</p>
        <p>L'équipe Tabeebou</p>
      </div>
    `
  }
};

/**
 * Envoyer un email
 * @param {Object} options - Options de l'email
 * @param {string} options.to - Destinataire
 * @param {string} options.subject - Sujet de l'email
 * @param {string} options.html - Corps de l'email en HTML
 * @returns {Promise<boolean>} - Indique si l'email a été envoyé avec succès
 */
const sendEmail = async (options) => {
  try {
    // Vérifier que le transporteur est initialisé
    if (!transporter) {
      logger.error('Transporteur d\'emails non initialisé');
      return false;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Tabeebou" <noreply@tabeebou.com>',
      to: options.to,
      subject: options.subject,
      html: options.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // Si en développement et Ethereal est utilisé, afficher le lien de prévisualisation
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      logger.info(`Email envoyé: ${info.messageId}`);
      logger.info(`Aperçu de l'email: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      logger.info(`Email envoyé à ${options.to}: ${options.subject}`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    return false;
  }
};

// Fonctions d'envoi d'emails spécifiques

/**
 * Envoyer un code OTP par email
 * @param {string} email - Adresse email du destinataire
 * @param {string} otpCode - Code OTP à envoyer
 * @returns {Promise<boolean>} - Indique si l'email a été envoyé avec succès
 */
exports.sendOtpEmail = async (email, otpCode) => {
  return await sendEmail({
    to: email,
    subject: 'Code de vérification Tabeebou',
    html: templates.otp(otpCode)
  });
};

/**
 * Envoyer un email de notification au médecin après son inscription
 * @param {Object} doctor - Objet médecin
 * @returns {Promise<boolean>} - Indique si l'email a été envoyé avec succès
 */
exports.sendDoctorRegistrationNotification = async (doctor) => {
  if (!doctor || !doctor.user || !doctor.user.email) {
    logger.error('Informations insuffisantes pour envoyer l\'email de notification au médecin');
    return false;
  }
  
  const name = doctor.full_name || doctor.user.fullName || '';
  
  return await sendEmail({
    to: doctor.user.email,
    subject: 'Bienvenue sur Tabeebou - Votre compte est en cours de vérification',
    html: templates.welcomeDoctor(name)
  });
};

/**
 * Envoyer une confirmation de rendez-vous par email
 * @param {Object} appointment - Objet rendez-vous
 * @param {Object} doctor - Objet médecin
 * @param {Object} patient - Objet patient
 * @returns {Promise<boolean>} - Indique si l'email a été envoyé avec succès
 */
exports.sendAppointmentConfirmation = async (appointment, doctor, patient) => {
  try {
    // Vérifier que nous avons toutes les informations nécessaires
    if (!appointment || !doctor || !doctor.user || !doctor.user.email || !patient || !patient.user || !patient.user.email) {
      logger.error('Informations insuffisantes pour envoyer l\'email de confirmation de rendez-vous');
      return false;
    }
    
    // Envoyer l'email au patient
    await sendEmail({
      to: patient.user.email,
      subject: 'Confirmation de votre rendez-vous médical',
      html: templates.appointmentConfirmation(appointment, doctor, patient)
    });
    
    // Envoyer l'email au médecin
    await sendEmail({
      to: doctor.user.email,
      subject: 'Nouveau rendez-vous confirmé',
      html: templates.appointmentConfirmation(appointment, doctor, patient)
    });
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors de l'envoi des emails de confirmation de rendez-vous: ${error.message}`);
    return false;
  }
};

/**
 * Envoyer le lien Zoom pour un rendez-vous
 * @param {Object} appointment - Objet rendez-vous
 * @param {Object} doctor - Objet médecin
 * @param {Object} patient - Objet patient
 * @param {string} zoomLink - Lien de la réunion Zoom
 * @returns {Promise<boolean>} - Indique si l'email a été envoyé avec succès
 */
exports.sendAppointmentZoomLink = async (appointment, doctor, patient, zoomLink) => {
  try {
    // Vérifier que nous avons toutes les informations nécessaires
    if (!appointment || !doctor || !doctor.user || !doctor.user.email || !patient || !patient.user || !patient.user.email || !zoomLink) {
      logger.error('Informations insuffisantes pour envoyer l\'email avec le lien Zoom');
      return false;
    }
    
    // Envoyer l'email au patient
    await sendEmail({
      to: patient.user.email,
      subject: 'Votre consultation va bientôt commencer - Lien de connexion',
      html: templates.appointmentZoomLink(appointment, doctor, patient, zoomLink)
    });
    
    // Envoyer l'email au médecin
    await sendEmail({
      to: doctor.user.email,
      subject: 'Votre prochaine consultation - Lien de connexion',
      html: templates.appointmentZoomLink(appointment, doctor, patient, zoomLink)
    });
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors de l'envoi des emails avec le lien Zoom: ${error.message}`);
    return false;
  }
};

/**
 * Envoyer un rappel de rendez-vous
 * @param {Object} appointment - Objet rendez-vous
 * @param {Object} doctor - Objet médecin
 * @param {Object} patient - Objet patient
 * @returns {Promise<boolean>} - Indique si l'email a été envoyé avec succès
 */
exports.sendAppointmentReminder = async (appointment, doctor, patient) => {
  try {
    // Vérifier que nous avons toutes les informations nécessaires
    if (!appointment || !doctor || !patient || !patient.user || !patient.user.email) {
      logger.error('Informations insuffisantes pour envoyer l\'email de rappel de rendez-vous');
      return false;
    }
    
    // Envoyer l'email au patient
    await sendEmail({
      to: patient.user.email,
      subject: 'Rappel: Votre rendez-vous médical de demain',
      html: templates.appointmentReminder(appointment, doctor, patient)
    });
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors de l'envoi de l'email de rappel de rendez-vous: ${error.message}`);
    return false;
  }
};

// Exporter la fonction de vérification de connexion SMTP pour l'utiliser dans d'autres modules
exports.verifyEmailConnection = verifyEmailConnection; 