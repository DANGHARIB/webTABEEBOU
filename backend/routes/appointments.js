const express = require('express');
const router = express.Router();
const { 
  createAppointment, 
  getAllAppointments, 
  getPatientAppointments,
  getDoctorAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  generateZoomLink
} = require('../controllers/appointmentController');
const { protect, admin, doctor, patient } = require('../middlewares/authMiddleware');

// Routes protégées pour les admins
router.get('/all', protect, admin, getAllAppointments);

// Routes protégées pour tous les utilisateurs authentifiés
router.get('/:id', protect, getAppointmentById);

// Routes protégées pour les patients
router.post('/', protect, patient, createAppointment);
router.get('/patient/me', protect, patient, getPatientAppointments);
router.put('/:id/reschedule', protect, patient, rescheduleAppointment);

// Routes protégées pour les médecins
router.get('/doctor/me', protect, doctor, getDoctorAppointments);
router.put('/:id/status', protect, doctor, updateAppointmentStatus);
router.post('/:id/zoom-link', protect, doctor, generateZoomLink);

module.exports = router; 