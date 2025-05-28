import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, isToday, isTomorrow, isAfter, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { doctorAPI } from '../../../services/api';
import './CreateAvailability.css';

// Interface pour les créneaux horaires
interface TimeSlot {
  startTime: string;
  endTime: string;
  id: string;
}

// Interface pour les disponibilités à envoyer à l'API
interface AvailabilityToSend {
  date: string;
  startTime: string;
  endTime: string;
}

// Interface pour les erreurs Axios
interface AxiosError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// Fonction pour obtenir le prochain créneau horaire disponible
const getNextAvailableTime = (): { hour: number; minute: number; formatted: string } => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Trouver le prochain créneau disponible en incréments de 30 minutes
  let nextAvailableHour = currentHour;
  let nextAvailableMinute = 0;
  
  // Arrondir à l'intervalle de 30 minutes suivant
  if (currentMinute < 30) {
    nextAvailableMinute = 30;
  } else {
    nextAvailableHour = currentHour + 1;
    nextAvailableMinute = 0;
  }
  
  // Si on passe à l'heure suivante et que c'est minuit, limiter à 23:30
  if (nextAvailableHour >= 24) {
    nextAvailableHour = 23;
    nextAvailableMinute = 30;
  }
  
  return {
    hour: nextAvailableHour,
    minute: nextAvailableMinute,
    formatted: `${nextAvailableHour.toString().padStart(2, '0')}:${nextAvailableMinute.toString().padStart(2, '0')}`
  };
};

// Fonction pour créer un slot initial avec l'heure actuelle
const getInitialTimeSlot = (): TimeSlot => {
  const startTime = getNextAvailableTime();
  
  // Ajouter une heure pour l'heure de fin
  let endHour = startTime.hour + 1;
  let endMinute = startTime.minute;
  
  // Si on dépasse minuit
  if (endHour >= 24) {
    endHour = 23;
    endMinute = 59;
  }
  
  const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  
  return {
    startTime: startTime.formatted,
    endTime: endTime,
    id: Date.now().toString()
  };
};

const CreateAvailability = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>(() => {
    // Initialiser avec l'heure actuelle arrondie aux 30 minutes suivantes
    return [getInitialTimeSlot()];
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showTip, setShowTip] = useState<boolean>(false);
  
  // Format date for display
  const formatDateForDisplay = (date: Date): string => {
    if (isToday(date)) {
      return 'Aujourd\'hui';
    } else if (isTomorrow(date)) {
      return 'Demain';
    } else {
      return format(date, 'EEEE d MMMM yyyy', { locale: fr });
    }
  };
  
  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedDate = new Date(e.target.value);
    setDate(selectedDate);
    
    // Si on change la date pour aujourd'hui, mettre à jour l'heure aussi
    if (isToday(selectedDate)) {
      setSlots([getInitialTimeSlot()]);
    }
  };
  
  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number, isStart: boolean): void => {
    const { value } = e.target;
    const newSlots = [...slots];
    
    if (isStart) {
      newSlots[slotIndex].startTime = value;
      
      // Mise à jour automatique de l'heure de fin (1 heure plus tard)
      const [hours, minutes] = value.split(':').map(Number);
      let endHour = hours + 1;
      let endMinute = minutes;
      
      // Si on dépasse minuit
      if (endHour >= 24) {
        endHour = 23;
        endMinute = 59;
      }
      
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      newSlots[slotIndex].endTime = endTime;
    } else {
      newSlots[slotIndex].endTime = value;
      
      // Vérifier que l'heure de fin est après l'heure de début
      const [startHour, startMinute] = newSlots[slotIndex].startTime.split(':').map(Number);
      const [endHour, endMinute] = value.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      // Si l'heure de fin est avant ou égale à l'heure de début
      if (endMinutes <= startMinutes) {
        // Calculer une nouvelle heure de fin valide (30 minutes après le début)
        let newEndHour = startHour;
        let newEndMinute = startMinute;
        
        if (newEndMinute === 0) {
          newEndMinute = 30;
        } else {
          newEndHour += 1;
          newEndMinute = 0;
        }
        
        if (newEndHour >= 24) {
          newEndHour = 23;
          newEndMinute = 30;
        }
        
        // Mettre à jour avec la nouvelle heure de fin valide
        const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;
        newSlots[slotIndex].endTime = newEndTime;
        
        // Informer l'utilisateur via une alerte
        setTimeout(() => {
          alert('L\'heure de fin doit être après l\'heure de début. L\'heure de fin a été ajustée automatiquement.');
        }, 100);
      }
    }
    
    setSlots(newSlots);
  };
  
  // Add a new time slot
  const addSlot = (): void => {
    // Utiliser le dernier slot comme base
    const lastSlot = slots[slots.length - 1];
    const [lastEndHour, lastEndMinute] = lastSlot.endTime.split(':').map(Number);
    
    // Commencer à partir de l'heure de fin du dernier slot
    let newStartHour = lastEndHour;
    let newStartMinute = lastEndMinute;
    
    // Calculer l'heure de fin (1 heure après le début)
    let newEndHour = newStartHour + 1;
    let newEndMinute = newStartMinute;
    
    // Gérer le dépassement de minuit
    if (newEndHour >= 24) {
      newEndHour = 23;
      newEndMinute = 59;
    }
    
    const newStartTime = `${newStartHour.toString().padStart(2, '0')}:${newStartMinute.toString().padStart(2, '0')}`;
    const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;
    
    setSlots([...slots, { 
      startTime: newStartTime, 
      endTime: newEndTime,
      id: Date.now().toString()
    }]);
  };
  
  // Remove a time slot
  const removeSlot = (index: number): void => {
    if (slots.length === 1) {
      alert('Vous devez conserver au moins un créneau horaire');
      return;
    }
    
    const newSlots = [...slots];
    newSlots.splice(index, 1);
    setSlots(newSlots);
  };
  
  // Quick date selection buttons
  const quickDateSelect = (daysToAdd: number): void => {
    const newDate = addDays(new Date(), daysToAdd);
    setDate(newDate);
    
    // Si on sélectionne aujourd'hui, mettre à jour l'heure aussi
    if (daysToAdd === 0) {
      setSlots([getInitialTimeSlot()]);
    }
  };
  
  // Save availabilities
  const saveAvailabilities = async (): Promise<void> => {
    // Check if any time slot is in the past
    if (isToday(date)) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if any slot has a start time in the past
      const pastSlots = slots.filter(slot => {
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        
        // Check if the slot is in the past
        if (startHour < currentHour) {
          return true; // Past hour
        } else if (startHour === currentHour) {
          // For current hour, check minutes
          return startMinute === 0 ? currentMinute > 0 : currentMinute >= 30;
        }
        
        return false; // Future time
      });
      
      if (pastSlots.length > 0) {
        alert('Vous ne pouvez pas créer des créneaux de disponibilité dans le passé. Veuillez sélectionner des créneaux horaires futurs.');
        return;
      }
    }

    // Validate slots
    const invalidSlots = slots.filter(slot => {
      const startParts = slot.startTime.split(':');
      const endParts = slot.endTime.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      return startMinutes >= endMinutes;
    });
    
    if (invalidSlots.length > 0) {
      alert('L\'heure de début doit être antérieure à l\'heure de fin pour chaque créneau.');
      return;
    }
    
    // Check for duplicate slots
    const uniqueSlots = new Set();
    const duplicates = slots.filter(slot => {
      const slotKey = `${slot.startTime}-${slot.endTime}`;
      if (uniqueSlots.has(slotKey)) {
        return true;
      }
      uniqueSlots.add(slotKey);
      return false;
    });
    
    if (duplicates.length > 0) {
      alert('Vous avez des créneaux horaires en double. Chaque créneau horaire doit être unique pour la journée.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Format date for the API
      const dateToSend = format(date, 'yyyy-MM-dd');
      
      // Prepare availabilities to send
      const availabilitiesToSend: AvailabilityToSend[] = slots.map(slot => ({
        date: dateToSend,
        startTime: slot.startTime,
        endTime: slot.endTime
      }));
      
      // API call to create availabilities
      await doctorAPI.createBatchAvailability(availabilitiesToSend);
      
      alert('Vos créneaux de disponibilité ont été enregistrés avec succès.');
      navigate('/doctor/availability');
    } catch (error: unknown) {
      console.error('Erreur lors de la création des disponibilités:', error);
      alert('Impossible de créer des créneaux de disponibilité. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-availability-container">
      <h1 className="page-title">Ajouter des disponibilités</h1>
      
      <div className="date-selection-container">
        <h2 className="section-title">1. Sélectionnez une date</h2>
        
        <div className="quick-date-buttons">
          <button 
            className={`quick-date-button ${isToday(date) ? 'active' : ''}`}
            onClick={() => quickDateSelect(0)}
          >
            Aujourd'hui
          </button>
          <button 
            className={`quick-date-button ${isTomorrow(date) ? 'active' : ''}`}
            onClick={() => quickDateSelect(1)}
          >
            Demain
          </button>
          <button 
            className={`quick-date-button ${!isToday(date) && !isTomorrow(date) && date.getDate() === addDays(new Date(), 2).getDate() ? 'active' : ''}`}
            onClick={() => quickDateSelect(2)}
          >
            Après-demain
          </button>
        </div>
        
        <div className="date-picker-container">
          <label htmlFor="date-picker">Ou sélectionnez une date spécifique:</label>
          <input 
            type="date" 
            id="date-picker" 
            className="date-picker"
            value={format(date, 'yyyy-MM-dd')}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={handleDateChange}
          />
        </div>
        
        <div className="selected-date">
          <span className="date-display">{formatDateForDisplay(date)}</span>
        </div>
      </div>
      
      <div className="time-slots-container">
        <div className="time-slots-header">
          <h2 className="section-title">2. Définissez vos créneaux horaires</h2>
          <button 
            type="button" 
            className="info-button"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            ?
          </button>
          {showTip && (
            <div className="tooltip">
              <p>Définissez les heures auxquelles vous êtes disponible pour des consultations.</p>
              <p>Vous pouvez ajouter plusieurs créneaux pour la même journée.</p>
              <p>Les créneaux ne peuvent pas se chevaucher et doivent être d'au moins 30 minutes.</p>
            </div>
          )}
        </div>
        
        {slots.map((slot, index) => (
          <div key={slot.id} className="time-slot">
            <div className="time-inputs">
              <div className="time-input-group">
                <label>Début:</label>
                <input 
                  type="time" 
                  value={slot.startTime}
                  onChange={(e) => handleTimeChange(e, index, true)}
                  className="time-input"
                  step="1800" // 30 minutes
                />
              </div>
              <div className="time-input-group">
                <label>Fin:</label>
                <input 
                  type="time" 
                  value={slot.endTime}
                  onChange={(e) => handleTimeChange(e, index, false)}
                  className="time-input"
                  step="1800" // 30 minutes
                />
              </div>
            </div>
            <button 
              type="button" 
              className="remove-slot-button"
              onClick={() => removeSlot(index)}
              disabled={slots.length === 1}
            >
              ×
            </button>
          </div>
        ))}
        
        <button 
          type="button" 
          className="add-slot-button"
          onClick={addSlot}
        >
          + Ajouter un créneau
        </button>
      </div>
      
      <div className="actions-container">
        <button 
          type="button" 
          className="cancel-button"
          onClick={() => navigate('/doctor/availability')}
        >
          Annuler
        </button>
        <button 
          type="button" 
          className="save-button"
          onClick={saveAvailabilities}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer les disponibilités'}
        </button>
      </div>
    </div>
  );
};

export default CreateAvailability;