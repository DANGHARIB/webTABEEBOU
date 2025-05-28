const express = require('express');
const router = express.Router();
const { 
  getPatientProfile,
  updatePatientProfile,
  saveDoctor,
  removeSavedDoctor,
  submitAssessment,
  getAssessmentResults,
  getMedicalHistory
} = require('../controllers/patientController');
const { protect, admin, patient } = require('../middlewares/authMiddleware');

// Routes protégées pour les patients
router.get('/profile', protect, patient, getPatientProfile);
router.put('/profile', protect, patient, updatePatientProfile);
router.post('/save-doctor/:doctorId', protect, patient, saveDoctor);
router.delete('/save-doctor/:doctorId', protect, patient, removeSavedDoctor);
router.post('/assessment', protect, patient, submitAssessment);
router.get('/assessment', protect, patient, getAssessmentResults);
router.get('/medical-history', protect, patient, getMedicalHistory);

module.exports = router; 