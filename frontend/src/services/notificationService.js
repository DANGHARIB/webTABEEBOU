import api from './api';

/**
 * Configure les notifications pour l'application web
 */
export const configureNotifications = async () => {
  try {
    // Vérifier si les notifications sont supportées par le navigateur
    if (!('Notification' in window)) {
      console.log('Ce navigateur ne prend pas en charge les notifications');
      return false;
    }

    // Demander la permission d'envoyer des notifications
    let permission = Notification.permission;
    
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
      console.log('Permission de notification non accordée!');
      return false;
    }

    // Enregistrer le service worker pour les notifications push (si nécessaire)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker enregistré avec succès:', registration);
        
        // Envoyer le token au backend (si applicable)
        try {
          await registerBrowserForNotifications();
        } catch (error) {
          console.error('Erreur lors de l\'enregistrement pour les notifications:', error);
        }
      } catch (error) {
        console.error('Erreur d\'enregistrement du Service Worker:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la configuration des notifications:', error);
    return false;
  }
};

/**
 * Enregistre le navigateur pour recevoir des notifications
 */
export const registerBrowserForNotifications = async () => {
  try {
    // Si vous utilisez un service de push notification comme Firebase
    // Vous pouvez obtenir un token ici et l'envoyer au backend
    
    // Exemple simple sans service de push externe
    const response = await api.post('/notifications/register-browser');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du navigateur:', error);
    throw error;
  }
};

/**
 * Affiche une notification dans le navigateur
 */
export const showNotification = (title, options = {}) => {
  if (!('Notification' in window)) {
    console.log('Ce navigateur ne prend pas en charge les notifications');
    return;
  }
  
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, options);
    
    if (options.onClick) {
      notification.onclick = options.onClick;
    }
    
    return notification;
  }
};

/**
 * Service de gestion des notifications
 */
const notificationService = {
  // Récupérer toutes les notifications de l'utilisateur
  getMyNotifications: async () => {
    try {
      const response = await api.get('/notifications');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      throw error;
    }
  },
  
  // Marquer une notification comme lue
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
      throw error;
    }
  },
  
  // Marquer toutes les notifications comme lues
  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
      throw error;
    }
  },
  
  // Supprimer une notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
      throw error;
    }
  },
  
  // Configurer les préférences de notification
  updateNotificationPreferences: async (preferences) => {
    try {
      const response = await api.put('/notifications/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      throw error;
    }
  },
  
  // Initialiser les notifications
  initialize: async () => {
    return await configureNotifications();
  },
  
  // Afficher une notification
  show: (title, options) => {
    return showNotification(title, options);
  }
};

export default notificationService;