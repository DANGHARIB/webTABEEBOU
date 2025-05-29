import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  addDays,
  isToday,
  isTomorrow
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faInfoCircle,
  faLongArrowAltRight,
  faClock,
  faSave,
  faPlus,
  faTimes,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';

import './CreateAvailability.css';
import { doctorAPI } from '../../../services/api';


// Interface for time slots
interface TimeSlot {
  startTime: string;
  endTime: string;
  id: string;
}

// Type for single slot API payload
type SingleSlotPayload = {
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}



// Interface for day cards in calendar
interface DayCard {
  date: Date;
  dayName: string;
  dayNumber: number;
  month: string;
}

// Function to get the next available time slot
const getNextAvailableTime = (): { hour: number; minute: number; formatted: string } => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Find the next available slot in 30-minute increments
  let nextAvailableHour = currentHour;
  let nextAvailableMinute = 0;
  
  // Round to the next 30-minute interval
  if (currentMinute < 30) {
    nextAvailableMinute = 30;
  } else {
    nextAvailableHour = currentHour + 1;
    nextAvailableMinute = 0;
  }
  
  // If we move to the next hour and it's midnight, limit to 23:30
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

// Function to create an initial time slot with the current time
const getInitialTimeSlot = (): TimeSlot => {
  const startTime = getNextAvailableTime();
  
  // Calculate end time (30 minutes or 1 hour after the start time)
  let endHour = startTime.hour;
  let endMinute = startTime.minute;
  
  // If start time is on the hour, add 30 minutes for end time
  if (endMinute === 0) {
    endMinute = 30;
  } else {
    // If start time is at half hour, add 1 hour (move to the next hour)
    endHour += 1;
    endMinute = 0;
  }
  
  // If we exceed midnight
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
    // Initialize with current time rounded to the next 30 minutes
    return [getInitialTimeSlot()];
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showTip, setShowTip] = useState<boolean>(false);
  const [dayCards, setDayCards] = useState<DayCard[]>([]);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  
  // Generate day cards for the next 14 days
  useEffect(() => {
    const generateDayCards = () => {
      const cards: DayCard[] = [];
      const today = new Date();
      
      for (let i = 0; i < 14; i++) {
        const currentDate = addDays(today, i);
        const dayName = format(currentDate, 'EEE', { locale: enUS });
        const dayNumber = currentDate.getDate();
        const month = format(currentDate, 'MMM', { locale: enUS });
        
        cards.push({
          date: currentDate,
          dayName,
          dayNumber,
          month
        });
      }
      
      return cards;
    };
    
    setDayCards(generateDayCards());
  }, []);
  
  // Format date for display
  const formatDateForDisplay = (date: Date): string => {
    if (isToday(date)) {
      return 'Today';
    } else if (isTomorrow(date)) {
      return 'Tomorrow';
    } else {
      return format(date, 'EEEE d MMMM yyyy', { locale: enUS });
    }
  };
  
  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedDate = new Date(e.target.value);
    setDate(selectedDate);
    
    // If we change the date to today, update the time as well
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
      
      // Calculate end time based on 30-minute intervals
      const [hours, minutes] = value.split(':').map(Number);
      let endHour = hours;
      let endMinute = minutes;
      
      // If start time is on the hour, add 30 minutes for end time
      if (endMinute === 0) {
        endMinute = 30;
      } else {
        // If start time is at half hour, add 1 hour (move to the next hour)
        endHour += 1;
        endMinute = 0;
      }
      
      // If we exceed midnight
      if (endHour >= 24) {
        endHour = 23;
        endMinute = 59;
      }
      
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      newSlots[slotIndex].endTime = endTime;
    } else {
      newSlots[slotIndex].endTime = value;
      
      // Check that end time is after start time
      const [startHour, startMinute] = newSlots[slotIndex].startTime.split(':').map(Number);
      const [endHour, endMinute] = value.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      // If end time is before or equal to start time
      if (endMinutes <= startMinutes) {
        // Calculate a valid new end time (30 minutes after start)
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
        
        // Update with the new valid end time
        const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;
        newSlots[slotIndex].endTime = newEndTime;
        
        // Inform user via alert
        setTimeout(() => {
          setShowAlert(true);
          setAlertMessage('End time must be after start time. End time has been adjusted automatically.');
          setTimeout(() => setShowAlert(false), 3000);
        }, 100);
      }
    }
    
    setSlots(newSlots);
  };
  
  // Add a new time slot
  const addSlot = (): void => {
    // Use the last slot as the base
    const lastSlot = slots[slots.length - 1];
    const [lastEndHour, lastEndMinute] = lastSlot.endTime.split(':').map(Number);
    
    // Start from the end time of the last slot
    const newStartHour = lastEndHour;
    const newStartMinute = lastEndMinute;
    
    // Calculate the end time based on 30-minute intervals
    let newEndHour = newStartHour;
    let newEndMinute = newStartMinute;
    
    // If start time is on the hour, add 30 minutes for end time
    if (newEndMinute === 0) {
      newEndMinute = 30;
    } else {
      // If start time is at half hour, add 1 hour (move to the next hour)
      newEndHour += 1;
      newEndMinute = 0;
    }
    
    // Handle midnight overflow
    if (newEndHour >= 24) {
      newEndHour = 23;
      newEndMinute = 59;
    }
    
    const newStartTime = `${newStartHour.toString().padStart(2, '0')}:${newStartMinute.toString().padStart(2, '0')}`;
    const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;
    
    // Check for overlapping slots
    const overlapping = slots.some(slot => {
      const [slotStartHour, slotStartMinute] = slot.startTime.split(':').map(Number);
      const [slotEndHour, slotEndMinute] = slot.endTime.split(':').map(Number);
      
      const slotStartMinutes = slotStartHour * 60 + slotStartMinute;
      const slotEndMinutes = slotEndHour * 60 + slotEndMinute;
      const newStartMinutes = newStartHour * 60 + newStartMinute;
      const newEndMinutes = newEndHour * 60 + newEndMinute;
      
      // Check if the new slot overlaps with any existing slot
      return (newStartMinutes < slotEndMinutes && newEndMinutes > slotStartMinutes);
    });
    
    if (overlapping) {
      setShowAlert(true);
      setAlertMessage('Cannot add overlapping time slots');
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }
    
    setSlots([...slots, { 
      startTime: newStartTime, 
      endTime: newEndTime, 
      id: Date.now().toString() 
    }]);
  };
  
  // Remove a time slot
  const removeSlot = (index: number): void => {
    if (slots.length === 1) {
      setShowAlert(true);
      setAlertMessage('You must keep at least one time slot');
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }
    
    const newSlots = [...slots];
    newSlots.splice(index, 1);
    setSlots(newSlots);
  };
  
  // Select a day from the day cards
  const selectDay = (selectedDate: Date): void => {
    setDate(selectedDate);
    
    // If selecting today, update the time slots to start from current time
    if (isToday(selectedDate)) {
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
        setShowAlert(true);
        setAlertMessage('You cannot create availability slots in the past. Please select future time slots.');
        setTimeout(() => setShowAlert(false), 5000);
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
      setShowAlert(true);
      setAlertMessage('Start time must be before end time for each slot.');
      setTimeout(() => setShowAlert(false), 5000);
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
      setShowAlert(true);
      setAlertMessage('You have duplicate time slots. Each time slot must be unique for the day.');
      setTimeout(() => setShowAlert(false), 5000);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Format date for the API
      const dateToSend = format(date, 'yyyy-MM-dd');
      
      // Simplifying the approach to fix the API error
      // The backend expects each availability to have doctorId and isBooked fields
      // Create a new function to directly create individual slots one by one
      try {
        setIsSubmitting(true);
        
        // Rather than batch creation, try creating one by one
        for (const slot of slots) {
          const singleSlot = {
            date: dateToSend,
            startTime: slot.startTime,
            endTime: slot.endTime,
            // Omit _id as it will be generated by the server
            isBooked: false
          };
          
          console.log('Creating availability slot:', JSON.stringify(singleSlot));
          
          // Use the single slot creation API instead of batch
          // This might avoid whatever validation issue is happening with the batch API
          await doctorAPI.createAvailability(singleSlot as { _id: string } & SingleSlotPayload);
          
          // Add a small delay between requests to avoid overloading the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('All slots created successfully');
      } catch (apiError) {
        console.error('Error creating availability slot:', apiError);
        throw apiError; // Re-throw to be caught by the outer try/catch
      }
      
      setShowAlert(true);
      setAlertMessage('Your availability slots have been saved successfully.');
      setTimeout(() => {
        setShowAlert(false);
        navigate('/doctor/availability');
      }, 2000);
    } catch (error: unknown) {
      // More detailed error logging
      console.error('Error creating availability:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number; data?: unknown; statusText?: string } };
        console.error('API Error status:', axiosError.response?.status, axiosError.response?.statusText);
        console.error('API Error details:', axiosError.response?.data);
        
        // More detailed error object examination
        if (axiosError.response?.data) {
          try {
            const errorData = axiosError.response.data;
            console.error('Error data type:', typeof errorData);
            
            if (typeof errorData === 'object') {
              Object.keys(errorData as object).forEach(key => {
                console.error(`Error field '${key}':`, (errorData as Record<string, unknown>)[key]);
              });
            }
            
            // If there's a message field, show it in the alert
            if (typeof errorData === 'object' && 'message' in (errorData as object)) {
              const errorMessage = (errorData as Record<string, unknown>).message;
              setAlertMessage(`Error: ${String(errorMessage)}`);
              return;
            }
          } catch (parseError) {
            console.error('Error parsing error data:', parseError);
          }
        }
      }
      
      setShowAlert(true);
      setAlertMessage('Unable to create availability slots. Please try again.');
      setTimeout(() => setShowAlert(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-availability-container">
      {showAlert && (
        <div className="alert-container">
          <div className="alert-message">
            <FontAwesomeIcon icon={faExclamationCircle} className="alert-icon" />
            {alertMessage}
          </div>
        </div>
      )}
      <h1 className="page-title">Add Availability Slots</h1>
      
      <div className="date-selection-container">
        <div className="calendar-header">
          <h2 className="section-title">1. Select a Date</h2>
          <FontAwesomeIcon icon={faCalendarAlt} className="calendar-icon" />
        </div>
        
        <div className="days-scroll-container">
          <div className="days-container">
            {dayCards.map((dayCard, index) => (
              <div 
                key={index} 
                className={`day-card ${format(date, 'yyyy-MM-dd') === format(dayCard.date, 'yyyy-MM-dd') ? 'active' : ''}`}
                onClick={() => selectDay(dayCard.date)}
              >
                <span className="day-name">{dayCard.dayName}</span>
                <div className="day-number-circle">
                  <span className="day-number">{dayCard.dayNumber}</span>
                </div>
                <span className="month-text">{dayCard.month}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="selected-date-container">
          <FontAwesomeIcon icon={faClock} className="selected-date-icon" />
          <span className="selected-date-text">{formatDateForDisplay(date)}</span>
        </div>
        
        <div className="date-picker-container">
          <label htmlFor="date-picker">Or select a specific date:</label>
          <input 
            type="date" 
            id="date-picker" 
            className="date-picker"
            value={format(date, 'yyyy-MM-dd')}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={handleDateChange}
          />
        </div>
      </div>
      
      <div className="time-slots-container">
        <div className="time-slots-header">
          <h2 className="section-title">2. Set Your Time Slots</h2>
          <button 
            type="button" 
            className="info-button"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            <FontAwesomeIcon icon={faInfoCircle} />
          </button>
          {showTip && (
            <div className="tooltip">
              <div className="tooltip-title">Availability Information</div>
              <div className="tooltip-item">
                <div className="bullet-point"></div>
                <p>Define the hours when you are available for consultations.</p>
              </div>
              <div className="tooltip-item">
                <div className="bullet-point"></div>
                <p>You can add multiple time slots for the same day.</p>
              </div>
              <div className="tooltip-item">
                <div className="bullet-point"></div>
                <p>Time slots must be at least 30 minutes long and cannot overlap.</p>
              </div>
            </div>
          )}
        </div>
        
        {slots.map((slot, index) => (
          <div key={slot.id} className="time-slot">
            <div className="slot-header">
              <span className="slot-header-text">Time Slot {index + 1}</span>
            </div>
            <div className="time-inputs">
              <div className="time-input-group">
                <label>Start:</label>
                <div className="time-selectors-wrapper">
                  <div className="custom-time-selector">
                    <select 
                      className="hour-select"
                      value={slot.startTime.split(':')[0]}
                      onChange={(e) => {
                        const hour = e.target.value;
                        const minute = slot.startTime.split(':')[1];
                        handleTimeChange({ target: { value: `${hour}:${minute}` } } as React.ChangeEvent<HTMLInputElement>, index, true);
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        <option key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select 
                      className="minute-select"
                      value={slot.startTime.split(':')[1]}
                      onChange={(e) => {
                        const hour = slot.startTime.split(':')[0];
                        const minute = e.target.value;
                        handleTimeChange({ target: { value: `${hour}:${minute}` } } as React.ChangeEvent<HTMLInputElement>, index, true);
                      }}
                    >
                      <option value="00">00</option>
                      <option value="30">30</option>
                    </select>
                  </div>
                </div>
              </div>
              <FontAwesomeIcon icon={faLongArrowAltRight} className="arrow-icon" />
              <div className="time-input-group">
                <label>End:</label>
                <div className="time-selectors-wrapper">
                  <div className="custom-time-selector">
                    <select 
                      className="hour-select"
                      value={slot.endTime.split(':')[0]}
                      onChange={(e) => {
                        const hour = e.target.value;
                        const minute = slot.endTime.split(':')[1];
                        handleTimeChange({ target: { value: `${hour}:${minute}` } } as React.ChangeEvent<HTMLInputElement>, index, false);
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        <option key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select 
                      className="minute-select"
                      value={slot.endTime.split(':')[1]}
                      onChange={(e) => {
                        const hour = slot.endTime.split(':')[0];
                        const minute = e.target.value;
                        handleTimeChange({ target: { value: `${hour}:${minute}` } } as React.ChangeEvent<HTMLInputElement>, index, false);
                      }}
                    >
                      <option value="00">00</option>
                      <option value="30">30</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className="remove-slot-button"
              onClick={() => removeSlot(index)}
              disabled={slots.length === 1}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        ))}
        
        <button 
          type="button" 
          className="add-slot-button"
          onClick={addSlot}
        >
          <FontAwesomeIcon icon={faPlus} /> Add Time Slot
        </button>
      </div>
      
      <div className="actions-container">
        <button 
          type="button" 
          className="cancel-button"
          onClick={() => navigate('/doctor/availability')}
        >
          Cancel
        </button>
        <button 
          type="button" 
          className="save-button"
          onClick={saveAvailabilities}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="spinner"></div>
              Saving...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} className="save-icon" />
              Save Availability
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateAvailability;