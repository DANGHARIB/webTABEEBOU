import { createContext, useState, useEffect, type ReactNode } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Système de gestion des notifications web
  const requestPermission = () => {
    if (!("Notification" in window)) {
      console.log("Ce navigateur ne prend pas en charge les notifications");
      return false;
    }
    
    if (Notification.permission === "granted") {
      return true;
    }
    
    if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          console.log("Permission accordée pour les notifications");
          return true;
        }
      });
    }
    
    return false;
  };

  // Demander la permission lors de l'initialisation
  useEffect(() => {
    requestPermission();
  }, []);
  
  // Nettoyer les notifications expirées automatiquement
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(currentNotifications => 
        currentNotifications.filter(notification => 
          notification.id !== 'auto-remove'));
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  const addNotification = (message: string, type: NotificationType, duration = 3000) => {
    const id = Date.now().toString();
    
    const notification = {
      id,
      message,
      type,
      duration
    };
    
    setNotifications(prevNotifications => [...prevNotifications, notification]);
    
    // Si le navigateur supporte les notifications et que l'utilisateur a accordé la permission
    if (Notification.permission === "granted" && type !== 'info') {
      // Créer une notification système
      new Notification("My App", {
        body: message
      });
    }
    
    // Retirer automatiquement après la durée spécifiée
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      addNotification, 
      removeNotification 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}; 