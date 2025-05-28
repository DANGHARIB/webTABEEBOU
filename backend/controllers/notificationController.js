const Notification = require('../models/Notification');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const logger = require('../config/logger');

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
exports.getUserNotifications = async (req, res) => {
  try {
    logger.info(`Récupération des notifications pour l'utilisateur ${req.user._id}`);
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtrer par statut (lu/non lu) si demandé
    let query = { recipient: req.user._id };
    if (req.query.read === 'true') {
      query.read = true;
    } else if (req.query.read === 'false') {
      query.read = false;
    }
    
    // Récupérer les notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Récupérer le nombre total pour la pagination
    const total = await Notification.countDocuments(query);
    
    logger.info(`${notifications.length} notifications récupérées pour l'utilisateur ${req.user._id}`);
    
    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des notifications: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    logger.info(`Marquage de la notification ${req.params.id} comme lue`);
    
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      logger.warn(`Notification ${req.params.id} non trouvée`);
      return res.status(404).json({ message: 'Notification non trouvée' });
    }
    
    // Vérifier que l'utilisateur est bien le destinataire
    if (notification.recipient.toString() !== req.user._id.toString()) {
      logger.warn(`L'utilisateur ${req.user._id} n'est pas autorisé à marquer la notification ${req.params.id}`);
      return res.status(403).json({ message: 'Non autorisé' });
    }
    
    // Marquer comme lu
    notification.read = true;
    notification.readAt = new Date();
    
    const updatedNotification = await notification.save();
    logger.info(`Notification ${req.params.id} marquée comme lue`);
    
    res.json(updatedNotification);
  } catch (error) {
    logger.error(`Erreur lors du marquage de la notification: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    logger.info(`Marquage de toutes les notifications comme lues pour l'utilisateur ${req.user._id}`);
    
    const result = await Notification.updateMany(
      { 
        recipient: req.user._id,
        read: false
      },
      { 
        $set: { 
          read: true,
          readAt: new Date()
        }
      }
    );
    
    logger.info(`${result.modifiedCount} notifications marquées comme lues pour l'utilisateur ${req.user._id}`);
    
    res.json({
      message: `${result.modifiedCount} notifications ont été marquées comme lues`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error(`Erreur lors du marquage de toutes les notifications: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    logger.info(`Suppression de la notification ${req.params.id}`);
    
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      logger.warn(`Notification ${req.params.id} non trouvée`);
      return res.status(404).json({ message: 'Notification non trouvée' });
    }
    
    // Vérifier que l'utilisateur est bien le destinataire
    if (notification.recipient.toString() !== req.user._id.toString()) {
      logger.warn(`L'utilisateur ${req.user._id} n'est pas autorisé à supprimer la notification ${req.params.id}`);
      return res.status(403).json({ message: 'Non autorisé' });
    }
    
    await notification.deleteOne();
    logger.info(`Notification ${req.params.id} supprimée`);
    
    res.json({ message: 'Notification supprimée' });
  } catch (error) {
    logger.error(`Erreur lors de la suppression de la notification: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications
// @access  Private
exports.deleteAllNotifications = async (req, res) => {
  try {
    logger.info(`Suppression de toutes les notifications pour l'utilisateur ${req.user._id}`);
    
    const result = await Notification.deleteMany({ recipient: req.user._id });
    
    logger.info(`${result.deletedCount} notifications supprimées pour l'utilisateur ${req.user._id}`);
    
    res.json({
      message: `${result.deletedCount} notifications ont été supprimées`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error(`Erreur lors de la suppression de toutes les notifications: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    logger.info(`Récupération du nombre de notifications non lues pour l'utilisateur ${req.user._id}`);
    
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });
    
    logger.info(`${count} notifications non lues pour l'utilisateur ${req.user._id}`);
    
    res.json({ count });
  } catch (error) {
    logger.error(`Erreur lors de la récupération du nombre de notifications non lues: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register device token for push notifications
// @route   POST /api/notifications/register-device
// @access  Private
exports.registerDeviceToken = async (req, res) => {
  try {
    const { deviceToken } = req.body;
    
    if (!deviceToken) {
      return res.status(400).json({ message: 'Le token de l\'appareil est requis' });
    }
    
    logger.info(`Enregistrement du token d'appareil pour l'utilisateur ${req.user._id}`);
    
    // Option 1: Save in the User model
    await User.findByIdAndUpdate(req.user._id, { deviceToken });
    
    // Option 2: Use in-memory store in the notification service
    notificationService.registerDeviceToken(req.user._id, deviceToken);
    
    logger.info(`Token d'appareil enregistré pour l'utilisateur ${req.user._id}`);
    
    res.json({ message: 'Token d\'appareil enregistré avec succès' });
  } catch (error) {
    logger.error(`Erreur lors de l'enregistrement du token d'appareil: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
}; 