const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser,
  registerDeviceToken
} = require('../controllers/userController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Route pour enregistrer le token d'appareil (accessible à tous les utilisateurs authentifiés)
router.post('/device-token', protect, registerDeviceToken);

// Routes administratives protégées (accessibles uniquement aux administrateurs)
router.get('/', protect, admin, getUsers);
router.get('/:id', protect, admin, getUserById);
router.put('/:id', protect, admin, updateUser);
router.delete('/:id', protect, admin, deleteUser);

module.exports = router; 