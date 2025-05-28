const express = require('express');
const router = express.Router();
const { 
  getAllDoctors, 
  getDoctorById, 
  updateDoctorProfile,
  verifyDoctor,
  getDoctorStats,
  rateDoctor,
  getDoctorReviews,
  updateDoctorProfileWithFiles,
  getCurrentDoctor
} = require('../controllers/doctorController');
const { protect, admin, doctor } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Routes publiques
router.get('/', getAllDoctors);

// Routes protégées pour les médecins - doivent être avant les routes avec :id
router.get('/me', protect, doctor, getCurrentDoctor);
router.put('/profile', protect, doctor, updateDoctorProfile);
router.post('/profile/with-files', protect, doctor, upload.array('certificationFiles', 5), updateDoctorProfileWithFiles);
router.get('/stats', protect, doctor, getDoctorStats);

// Routes publiques avec paramètres - doivent être après les routes spécifiques
router.get('/:id', getDoctorById);
router.get('/:id/reviews', getDoctorReviews);

// Routes protégées pour les patients
router.post('/:id/rate', protect, rateDoctor);

// Routes protégées pour les admins
router.put('/:id/verify', protect, admin, verifyDoctor);

module.exports = router; 