const express = require('express');
const router = express.Router();
const { 
  addPaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod
} = require('../controllers/paymentMethodController');
const { protect, patient } = require('../middlewares/authMiddleware');

// Routes protégées pour les patients
router.post('/', protect, patient, addPaymentMethod);
router.get('/', protect, patient, getPaymentMethods);
router.put('/:id', protect, patient, updatePaymentMethod);
router.put('/:id/default', protect, patient, setDefaultPaymentMethod);
router.delete('/:id', protect, patient, deletePaymentMethod);

module.exports = router; 