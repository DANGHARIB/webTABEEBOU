const express = require('express');
const router = express.Router();
const { 
  getQuestions, 
  getQuestionById, 
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitResponses,
  getUserResponses,
  getAssessmentQuestions
} = require('../controllers/questionController');
const { protect, admin, patient } = require('../middlewares/authMiddleware');

// Routes publiques
router.get('/', getQuestions);
router.get('/:id', getQuestionById);

// Route pour obtenir les questions d'évaluation pour les patients
router.get('/assessment', protect, patient, getAssessmentQuestions);

// Routes protégées pour les patients
router.post('/submit-responses', protect, patient, submitResponses);
router.get('/user-responses', protect, getUserResponses);

// Routes administratives
router.post('/', protect, admin, createQuestion);
router.put('/:id', protect, admin, updateQuestion);
router.delete('/:id', protect, admin, deleteQuestion);

module.exports = router; 