const Appointment = require("../models/Appointment");
const Availability = require("../models/Availability");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const User = require("../models/User");
const notificationService = require("../services/notificationService");
const paymentService = require("../services/paymentService");
const { sendAppointmentZoomLink } = require("../services/emailService");
const logger = require("../config/logger");

/**
 * Helper function to get all availability IDs for the same day for a doctor
 * Used to check if a patient already has an appointment with a doctor on the same day
 */
async function getAvailabilitiesForSameDay(dateString, doctorId) {
  try {
    // Get date parts for matching
    const date = new Date(dateString);
    date.setUTCHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    
    // Find all availabilities for the doctor on the given date
    const availabilities = await Availability.find({
      doctor: doctorId,
      date: {
        $gte: date,
        $lt: nextDay
      }
    });
    
    return availabilities.map(avail => avail._id);
  } catch (error) {
    logger.error(`Erreur getAvailabilitiesForSameDay: ${error.message}`);
    throw error;
  }
}

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private/Patient
exports.createAppointment = async (req, res) => {
  try {
    logger.info("Création d'un nouveau rendez-vous");
    
    const { 
      availabilityId, 
      doctorId, 
      slotStartTime,
      slotEndTime,
      duration,
      metadata
    } = req.body;
    
    // Validate inputs
    if (!availabilityId || !doctorId || !slotStartTime || !slotEndTime || !duration) {
      logger.warn("Données manquantes pour la création du rendez-vous");
      return res.status(400).json({ message: "Veuillez fournir toutes les informations requises" });
    }

    // Check if the user is a patient
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      logger.warn(`L'utilisateur ${req.user._id} n'est pas un patient`);
      return res.status(403).json({ message: "Accès non autorisé. Profil de patient requis." });
    }

    // Check if the availability exists
    const availability = await Availability.findById(availabilityId);
    if (!availability) {
      logger.warn(`Disponibilité ${availabilityId} non trouvée`);
      return res.status(404).json({ message: "Créneau horaire non trouvé" });
    }

    // Check if the doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      logger.warn(`Médecin ${doctorId} non trouvé`);
      return res.status(404).json({ message: "Médecin non trouvé" });
    }

    // Check if the availability belongs to the doctor
    if (availability.doctor.toString() !== doctorId) {
      logger.warn(`La disponibilité ${availabilityId} n'appartient pas au médecin ${doctorId}`);
      return res.status(400).json({ message: "Ce créneau n'appartient pas au médecin spécifié" });
    }

    // Check if there is already an appointment for this time slot
    const existingAppointment = await Appointment.findOne({
      availability: availabilityId,
      slotStartTime,
      status: { $nin: ['cancelled'] }
    });

    if (existingAppointment) {
      logger.warn(`Créneau ${availabilityId} déjà réservé`);
      return res.status(400).json({ message: "Ce créneau a déjà été réservé" });
    }

    // Check if the patient already has an appointment with this doctor on the same day
    const availabilitiesForSameDay = await getAvailabilitiesForSameDay(availability.date, doctorId);
    
    const existingAppointmentSameDay = await Appointment.findOne({
      patient: patient._id,
      doctor: doctorId,
      availability: { $in: availabilitiesForSameDay },
      status: { $nin: ['cancelled'] }
    });

    if (existingAppointmentSameDay) {
      logger.warn(`Patient ${patient._id} a déjà un rendez-vous avec le médecin ${doctorId} le même jour`);
      return res.status(400).json({ 
        message: "Vous avez déjà un rendez-vous avec ce médecin à cette date",
        existingAppointment: existingAppointmentSameDay
      });
    }

    // Calculate appointment price based on doctor's rate and duration
    const price = await paymentService.calculateAppointmentPrice(doctorId, duration);

    // Create appointment
    const appointment = new Appointment({
      doctor: doctorId,
      patient: patient._id,
      availability: availabilityId,
      slotStartTime,
      slotEndTime,
      duration,
      price,
      status: 'pending',
      paymentStatus: 'pending',
      metadata
    });

    const createdAppointment = await appointment.save();
    logger.info(`Rendez-vous créé: ${createdAppointment._id}`);

    // Mark the availability as booked
    availability.isBooked = true;
    await availability.save();
    logger.info(`Disponibilité ${availabilityId} marquée comme réservée`);

    // Schedule a Zoom meeting when appointment is confirmed (will be done after payment)

    // Send notifications (internally handled by the service)
    try {
      await notificationService.notifyAppointmentCreated(createdAppointment);
    } catch (notifError) {
      logger.error(`Erreur lors de l'envoi des notifications: ${notifError.message}`);
      // Continue despite notification error
    }

    res.status(201).json({
      appointment: createdAppointment,
      message: "Rendez-vous créé avec succès. Veuillez procéder au paiement."
    });
  } catch (error) {
    logger.error(`Erreur lors de la création du rendez-vous: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private/Admin
exports.getAllAppointments = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    
    const appointments = await Appointment.find({})
      .populate('doctor')
      .populate('patient')
      .populate('availability')
      .sort({ createdAt: -1 });
    
    res.json(appointments);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des rendez-vous: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get appointments for the logged-in doctor
// @route   GET /api/appointments/doctor
// @access  Private/Doctor
exports.getDoctorAppointments = async (req, res) => {
  try {
    // Check if the user is a doctor
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      return res.status(403).json({ message: "Accès non autorisé. Profil de médecin requis." });
    }
    
    let query = { doctor: doctor._id };
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by date
    if (req.query.date) {
      const date = new Date(req.query.date);
      date.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      
      // Get all availabilities for this date
      const availabilities = await Availability.find({ 
        doctor: doctor._id,
        date: {
          $gte: date,
          $lt: nextDay
        }
      });
      
      const availabilityIds = availabilities.map(avail => avail._id);
      query.availability = { $in: availabilityIds };
    }
    
    const appointments = await Appointment.find(query)
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'fullName email'
        }
      })
      .populate('availability')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: appointments,
      message: "Appointments fetched successfully."
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des rendez-vous du médecin: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get appointments for the logged-in patient
// @route   GET /api/appointments/patient
// @access  Private/Patient
exports.getPatientAppointments = async (req, res) => {
  try {
    // Check if the user is a patient
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(403).json({ message: "Accès non autorisé. Profil de patient requis." });
    }
    
    let query = { patient: patient._id };
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    const appointments = await Appointment.find(query)
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'fullName email'
        }
      })
      .populate('availability')
      .sort({ createdAt: -1 });
    
    res.json(appointments);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des rendez-vous du patient: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'fullName email'
        }
      })
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'fullName email'
        }
      })
      .populate('availability');
    
    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous non trouvé" });
    }
    
    // Check if the user is authorized to view this appointment (doctor, patient, or admin)
    const isDoctor = req.user.role === 'Doctor' && appointment.doctor.user._id.toString() === req.user._id.toString();
    const isPatient = req.user.role === 'Patient' && appointment.patient.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    
    if (!isDoctor && !isPatient && !isAdmin) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à voir ce rendez-vous" });
    }
    
    res.json(appointment);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du rendez-vous: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor')
      .populate('patient')
      .populate('availability');
    
    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous non trouvé" });
    }
    
    // Check authorization based on the requested status change
    const isDoctor = req.user.role === 'Doctor' && appointment.doctor.user.toString() === req.user._id.toString();
    const isPatient = req.user.role === 'Patient' && appointment.patient.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    
    if (!isDoctor && !isPatient && !isAdmin) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce rendez-vous" });
    }
    
    // Check if the status change is valid
    const validStatusTransitions = {
      pending: ['confirmed', 'cancelled', 'rejected'],
      confirmed: ['scheduled', 'completed', 'cancelled', 'reschedule_requested'],
      scheduled: ['completed', 'cancelled', 'reschedule_requested'],
      reschedule_requested: ['confirmed', 'cancelled'],
      completed: [],
      cancelled: [],
      rejected: []
    };
    
    if (!validStatusTransitions[appointment.status].includes(status)) {
      return res.status(400).json({ 
        message: `Transition de statut invalide: ${appointment.status} -> ${status}`,
        valid: validStatusTransitions[appointment.status]
      });
    }
    
    // Specific validations for different status changes
    if (status === 'cancelled') {
      if (!reason) {
        return res.status(400).json({ message: "Une raison d'annulation est requise" });
      }
      
      // If the appointment has been paid, initiate refund
      if (appointment.paymentStatus === 'completed') {
        // Logic for refund would go here
        logger.info(`Remboursement à initier pour le rendez-vous ${appointment._id}`);
      }
      
      appointment.cancellationReason = reason;
      appointment.cancelledBy = req.user._id;
      appointment.cancelledAt = new Date();
      
      // Free up the availability
      const availability = await Availability.findById(appointment.availability);
      if (availability) {
        availability.isBooked = false;
        await availability.save();
      }
      
      // Send cancellation notifications
      await notificationService.notifyAppointmentCancelled(appointment);
    }
    
    if (status === 'reschedule_requested' && isDoctor) {
      if (!reason) {
        return res.status(400).json({ message: "Une raison de reprogrammation est requise" });
      }
      
      appointment.rescheduleReason = reason;
      appointment.rescheduleRequestedBy = req.user._id;
      appointment.rescheduleRequestedAt = new Date();
      
      // Send reschedule request notification
      await notificationService.notifyRescheduleRequest(appointment._id);
    }
    
    if (status === 'completed' && !isDoctor) {
      return res.status(403).json({ message: "Seul le médecin peut marquer un rendez-vous comme terminé" });
    }
    
    // Update the appointment status
    appointment.status = status;
    
    if (status === 'completed') {
      appointment.completedAt = new Date();
    }
    
    const updatedAppointment = await appointment.save();
    
    res.json(updatedAppointment);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du statut du rendez-vous: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reschedule an appointment
// @route   PUT /api/appointments/:id/reschedule
// @access  Private/Patient
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { availabilityId, slotStartTime, slotEndTime } = req.body;
    
    if (!availabilityId || !slotStartTime || !slotEndTime) {
      return res.status(400).json({ message: "Veuillez fournir toutes les informations requises" });
    }
    
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor')
      .populate('patient');
    
    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous non trouvé" });
    }
    
    // Check if the user is the patient who booked the appointment
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient || patient._id.toString() !== appointment.patient._id.toString()) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à reprogrammer ce rendez-vous" });
    }
    
    // Check if the appointment can be rescheduled
    const rescheduleableStatuses = ['pending', 'confirmed', 'reschedule_requested'];
    if (!rescheduleableStatuses.includes(appointment.status)) {
      return res.status(400).json({ message: `Impossible de reprogrammer un rendez-vous avec le statut ${appointment.status}` });
    }
    
    // Check if the new availability exists
    const newAvailability = await Availability.findById(availabilityId);
    if (!newAvailability) {
      return res.status(404).json({ message: "Nouveau créneau horaire non trouvé" });
    }
    
    // Check if the availability belongs to the same doctor
    if (newAvailability.doctor.toString() !== appointment.doctor._id.toString()) {
      return res.status(400).json({ message: "Le nouveau créneau doit appartenir au même médecin" });
    }
    
    // Check if there is already an appointment for this time slot
    const existingAppointment = await Appointment.findOne({
      availability: availabilityId,
      slotStartTime,
      status: { $nin: ['cancelled'] }
    });
    
    if (existingAppointment && existingAppointment._id.toString() !== appointment._id.toString()) {
      return res.status(400).json({ message: "Ce créneau a déjà été réservé" });
    }
    
    // Store old availability and date/time for notifications
    const oldAvailability = appointment.availability;
    const oldAvailabilityObj = await Availability.findById(oldAvailability);
    const oldDate = oldAvailabilityObj ? oldAvailabilityObj.date.toLocaleDateString('fr-FR') : 'date inconnue';
    const oldTime = appointment.slotStartTime;
    
    // Check if the appointment is being moved to a different day
    const oldDate_obj = new Date(oldAvailabilityObj.date);
    oldDate_obj.setUTCHours(0, 0, 0, 0);
    
    const newDate_obj = new Date(newAvailability.date);
    newDate_obj.setUTCHours(0, 0, 0, 0);
    
    const differentDay = oldDate_obj.getTime() !== newDate_obj.getTime();
    
    if (differentDay) {
      // Check if the patient already has an appointment with this doctor on the same day
      const availabilitiesForSameDay = await getAvailabilitiesForSameDay(newAvailability.date, appointment.doctor);
      
      const existingAppointmentSameDay = await Appointment.findOne({
        patient: patient._id,
        doctor: appointment.doctor,
        availability: { $in: availabilitiesForSameDay },
        status: { $nin: ['cancelled'] },
        _id: { $ne: appointment._id }
      });
      
      if (existingAppointmentSameDay) {
        return res.status(400).json({ 
          message: "Vous avez déjà un rendez-vous avec ce médecin à cette date",
          existingAppointment: existingAppointmentSameDay
        });
      }
    }
    
    // Free up the old availability
    if (oldAvailabilityObj) {
      oldAvailabilityObj.isBooked = false;
      await oldAvailabilityObj.save();
    }
    
    // Mark the new availability as booked
    newAvailability.isBooked = true;
    await newAvailability.save();
    
    // Update the appointment
    appointment.availability = availabilityId;
    appointment.slotStartTime = slotStartTime;
    appointment.slotEndTime = slotEndTime;
    appointment.status = 'confirmed'; // Reset to confirmed if it was reschedule_requested
    
    const updatedAppointment = await appointment.save();
    
    // Send notifications
    await notificationService.notifyAppointmentRescheduledByPatient(updatedAppointment, oldDate, oldTime);
    
    res.json({
      appointment: updatedAppointment,
      message: "Rendez-vous reprogrammé avec succès"
    });
  } catch (error) {
    logger.error(`Erreur lors de la reprogrammation du rendez-vous: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate Zoom link for appointment
// @route   POST /api/appointments/:id/zoom-link
// @access  Private/Doctor
exports.generateZoomLink = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor')
      .populate('patient')
      .populate('availability');
    
    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous non trouvé" });
    }
    
    // Check if the user is the doctor for this appointment
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor || doctor._id.toString() !== appointment.doctor._id.toString()) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à générer un lien pour ce rendez-vous" });
    }
    
    // Check if the appointment status allows generating a link
    const validStatuses = ['confirmed', 'scheduled'];
    if (!validStatuses.includes(appointment.status)) {
      return res.status(400).json({ message: `Impossible de générer un lien pour un rendez-vous avec le statut ${appointment.status}` });
    }
    
    // Generate a Zoom meeting link (simulated here)
    const zoomLink = `https://zoom.us/j/${Math.floor(100000000 + Math.random() * 900000000)}`;
    
    // Save the link to the appointment
    appointment.videoCallLink = zoomLink;
    appointment.status = 'scheduled';
    
    const updatedAppointment = await appointment.save();
    
    // Send the link to both doctor and patient via email
    try {
      await sendAppointmentZoomLink(
        appointment,
        appointment.doctor,
        appointment.patient,
        zoomLink
      );
    } catch (emailError) {
      logger.error(`Erreur lors de l'envoi de l'email avec le lien Zoom: ${emailError.message}`);
      // Continue despite email error
    }
    
    res.json({
      appointment: updatedAppointment,
      zoomLink,
      message: "Lien de consultation généré et envoyé par email"
    });
  } catch (error) {
    logger.error(`Erreur lors de la génération du lien Zoom: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
}; 