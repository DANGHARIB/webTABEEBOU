import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, isToday, isTomorrow, isAfter } from 'date-fns';
import { doctorAPI } from '../../../services/api';
import './AvailabilityList.css';

// Interface pour les erreurs Axios
interface AxiosError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// Interface pour les disponibilités
interface Availability {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

const AvailabilityList = () => {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Fonction pour charger les disponibilités
  const fetchAvailabilities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await doctorAPI.getMyAvailability();
      
      // Trier les disponibilités par date et heure
      const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime() || 
               a.startTime.localeCompare(b.startTime);
      });
      
      setAvailabilities(sortedData);
      setLoading(false);
    } catch (err: unknown) {
      console.error('Erreur lors du chargement des disponibilités:', err);
      setError('Impossible de charger vos disponibilités');
      setLoading(false);
    }
  }, []);
  
  // Charger les disponibilités au chargement du composant
  useEffect(() => {
    fetchAvailabilities();
  }, [fetchAvailabilities]);
  
  // Supprimer une disponibilité
  const handleDeleteAvailability = async (id: string) => {
    try {
      // Trouver la disponibilité à afficher dans l'alerte
      const availability = availabilities.find(a => a._id === id);
      if (!availability) return;
      
      const formattedDate = format(parseISO(availability.date), 'dd MMMM yyyy');
      
      if (window.confirm(`Voulez-vous supprimer cette disponibilité du ${formattedDate} de ${availability.startTime} à ${availability.endTime} ?`)) {
        setLoading(true);
        await doctorAPI.deleteAvailability(id);
        
        // Mettre à jour la liste
        fetchAvailabilities();
        
        alert('Disponibilité supprimée avec succès');
      }
    } catch (err: unknown) {
      console.error('Erreur lors de la suppression de la disponibilité:', err);
      alert('Impossible de supprimer cette disponibilité');
      setLoading(false);
    }
  };
  
  // Formater l'en-tête de date de manière conviviale
  const formatDateHeader = (dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return 'Aujourd\'hui';
    } else if (isTomorrow(date)) {
      return 'Demain';
    } else {
      return format(date, 'EEEE dd MMMM yyyy');
    }
  };
  
  // Regrouper les disponibilités par jour pour l'affichage
  const groupedAvailabilities = availabilities.reduce((groups, availability) => {
    const date = format(parseISO(availability.date), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(availability);
    return groups;
  }, {});
  
  // Convertir les dates groupées en tableau pour l'affichage
  const dateGroups = Object.keys(groupedAvailabilities).sort();
  
  // Obtenir le nombre de disponibilités futures
  const futureAvailabilitiesCount = availabilities.filter(availability => {
    const availabilityDate = parseISO(availability.date);
    
    // Si c'est déjà réservé, ne pas compter
    if (availability.isBooked) return false;
    
    // Si c'est une date future, compter
    if (isAfter(availabilityDate, new Date())) return true;
    
    // Si c'est aujourd'hui, vérifier si l'heure est passée ou non
    if (isToday(availabilityDate)) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      const [availStartHour, availStartMinute] = availability.startTime.split(':').map(Number);
      
      // Convertir en minutes pour faciliter la comparaison
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const availStartTimeInMinutes = availStartHour * 60 + availStartMinute;
      
      // Ne compter que si l'heure de début n'est pas encore passée
      return availStartTimeInMinutes > currentTimeInMinutes;
    }
    
    // Si c'est dans le passé, ne pas compter
    return false;
  }).length;
  
  const renderEmptyState = () => (
    <div className="empty-container">
      <div className="empty-icon">📅</div>
      <h3 className="empty-text">Aucune disponibilité définie</h3>
      <p className="empty-subtext">
        Ajoutez vos premiers créneaux de disponibilité en cliquant sur le bouton ci-dessous
      </p>
      <div className="empty-state-steps">
        <div className="empty-state-step">
          <div className="step-circle"><span className="step-number">1</span></div>
          <span className="step-text">Cliquez sur "Ajouter des disponibilités"</span>
        </div>
        <div className="empty-state-step">
          <div className="step-circle"><span className="step-number">2</span></div>
          <span className="step-text">Sélectionnez des dates et des heures</span>
        </div>
        <div className="empty-state-step">
          <div className="step-circle"><span className="step-number">3</span></div>
          <span className="step-text">Enregistrez pour vous rendre disponible</span>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="availability-container">
      <div className="header">
        <h2 className="page-title">Disponibilités</h2>
        {!loading && availabilities.length > 0 && (
          <div className="stats">
            <div className="stat-item">
              <span className="stat-value">{futureAvailabilitiesCount}</span>
              <span className="stat-label">Créneaux disponibles</span>
            </div>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p className="loading-text">Chargement de votre agenda...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
          <button className="retry-button" onClick={() => fetchAvailabilities()}>
            Réessayer
          </button>
        </div>
      ) : availabilities.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="content-container">
          {dateGroups.map(dateString => (
            <div key={dateString} className="date-group">
              <div className="date-header-container">
                <div className="date-header-line"></div>
                <h3 className="date-header">
                  {formatDateHeader(dateString)}
                </h3>
                <div className="date-header-line"></div>
              </div>
              
              {groupedAvailabilities[dateString].map(availability => (
                <div key={availability._id} className={`slot-card ${availability.isBooked ? 'booked-slot' : ''}`}>
                  <div className="slot-info">
                    <div className="time-container">
                      <span className="time-text">
                        {availability.startTime} - {availability.endTime}
                      </span>
                      {isToday(parseISO(availability.date)) && (
                        <span className="today-badge">Aujourd'hui</span>
                      )}
                    </div>
                    {availability.isBooked && (
                      <div className="booked-badge">
                        <span className="booked-icon">📅</span>
                        <span className="booked-text">Réservé</span>
                      </div>
                    )}
                  </div>
                  
                  {!availability.isBooked && (
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteAvailability(availability._id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      
      <Link to="/doctor/availability/create" className="add-button">
        <span className="add-icon">➕</span>
        <span className="add-button-text">Ajouter des disponibilités</span>
      </Link>
    </div>
  );
};

export default AvailabilityList;