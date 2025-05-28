const express = require('express');
const router = express.Router();
const {
  createPayment,
  getPatientPayments,
  getDoctorPayments,
  getPaymentById,
  refundPayment,
  getAllPayments,
  createPaymentIntent
} = require('../controllers/paymentController');
const { protect, admin, patient, doctor } = require('../middlewares/authMiddleware');

// Routes protégées pour les patients
router.post('/', protect, patient, createPayment);
router.get('/patient', protect, patient, getPatientPayments);
router.post('/create-payment-intent', protect, patient, createPaymentIntent);

// Routes protégées pour les médecins
router.get('/doctor', protect, doctor, getDoctorPayments);

// Routes protégées pour les administrateurs
router.get('/', protect, admin, getAllPayments);
router.post('/:id/refund', protect, admin, refundPayment);

// Routes protégées communes
router.get('/:id', protect, getPaymentById);

module.exports = router; 