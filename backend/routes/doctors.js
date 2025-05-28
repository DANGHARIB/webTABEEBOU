const express = require('express');
const router = express.Router();
const { 
  getAllDoctors, 
  getDoctorById, 
  updateDoctorProfile,
  verifyDoctor,
  getDoctorStats,
  rateDoctor,
  getDoctorReviews
} = require('../controllers/doctorController');
const { protect, admin, doctor } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Routes publiques
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/reviews', getDoctorReviews);

// Routes protégées pour les patients
router.post('/:id/rate', protect, rateDoctor);

// Routes protégées pour les médecins
router.put('/profile', protect, doctor, updateDoctorProfile);
router.get('/stats', protect, doctor, getDoctorStats);

// Routes protégées pour les admins
router.put('/:id/verify', protect, admin, verifyDoctor);

module.exports = router; 