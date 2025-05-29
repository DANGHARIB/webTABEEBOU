const express = require('express');
const router = express.Router();
const doctorRoutes = express.Router(); // Create a new router for doctor-specific routes
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

// IMPORTANT: Create a completely separate route handler for the 'me' endpoint
// This ensures it won't conflict with any ID-based routes

// Routes publiques
router.get('/', getAllDoctors);

// Define a special route for the current doctor profile that won't conflict with ID routes
// Make sure this is registered before any parameterized routes
router.get('/profile/me', protect, doctor, getCurrentDoctor);
router.put('/profile', protect, doctor, updateDoctorProfile);
router.post('/profile/with-files', protect, doctor, upload.array('certificationFiles', 5), updateDoctorProfileWithFiles);
router.get('/stats', protect, doctor, getDoctorStats);

// Routes publiques avec paramètres
router.get('/:id', getDoctorById);
router.get('/:id/reviews', getDoctorReviews);

// Routes protégées pour les patients
router.post('/:id/rate', protect, rateDoctor);

// Routes protégées pour les admins
router.put('/:id/verify', protect, admin, verifyDoctor);

// Create the compatibility route for backward compatibility
// This will redirect from the old endpoint to the new one
router.get('/me', protect, doctor, (req, res, next) => {
  // Forward to the new dedicated endpoint
  res.redirect(307, '/api/doctors/profile/me');
});

module.exports = router;