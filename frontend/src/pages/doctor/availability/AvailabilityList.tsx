import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, isToday, isTomorrow, isAfter } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarPlus, faCalendarDay, faTrash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { doctorAPI } from '../../../services/api';
import './AvailabilityList.css';

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
  
  // Function to load availabilities
  const fetchAvailabilities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await doctorAPI.getMyAvailability();
      
      // Sort availabilities by date and time
      const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime() || 
               a.startTime.localeCompare(b.startTime);
      });
      
      setAvailabilities(sortedData);
      setLoading(false);
    } catch (err: unknown) {
      console.error('Error loading availabilities:', err);
      setError('Unable to load your availabilities');
      setLoading(false);
    }
  }, []);
  
  // Load availabilities when the component mounts
  useEffect(() => {
    fetchAvailabilities();
  }, [fetchAvailabilities]);
  
  // Delete an availability slot
  const handleDeleteAvailability = async (id: string) => {
    try {
      // Find the availability to display in the alert
      const availability = availabilities.find(a => a._id === id);
      if (!availability) return;
      
      const formattedDate = format(parseISO(availability.date), 'MMMM dd, yyyy');
      
      if (window.confirm(`Do you want to delete this availability on ${formattedDate} from ${availability.startTime} to ${availability.endTime}?`)) {
        setLoading(true);
        await doctorAPI.deleteAvailability(id);
        
        // Update the list
        fetchAvailabilities();
        
        alert('Availability successfully deleted');
      }
    } catch (err: unknown) {
      console.error('Error deleting availability:', err);
      alert('Unable to delete this availability');
      setLoading(false);
    }
  };
  
  // Format the date header in a user-friendly way
  const formatDateHeader = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return 'Today';
    } else if (isTomorrow(date)) {
      return 'Tomorrow';
    } else {
      return format(date, 'EEEE, MMMM dd, yyyy');
    }
  };
  
  // Group availabilities by day for display
  const groupedAvailabilities: Record<string, Availability[]> = availabilities.reduce((groups: Record<string, Availability[]>, availability) => {
    const date = format(parseISO(availability.date), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(availability);
    return groups;
  }, {});
  
  // Convert grouped dates to array for display
  const dateGroups = Object.keys(groupedAvailabilities).sort();
  
  // Get the count of future availabilities
  const futureAvailabilitiesCount = availabilities.filter(availability => {
    const availabilityDate = parseISO(availability.date);
    
    // If it's already booked, don't count it
    if (availability.isBooked) return false;
    
    // If it's a future date, count it
    if (isAfter(availabilityDate, new Date())) return true;
    
    // If it's today, check if the time has passed
    if (isToday(availabilityDate)) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      const [availStartHour, availStartMinute] = availability.startTime.split(':').map(Number);
      
      // Convert to minutes for easier comparison
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const availStartTimeInMinutes = availStartHour * 60 + availStartMinute;
      
      // Only count if the start time hasn't passed yet
      return availStartTimeInMinutes > currentTimeInMinutes;
    }
    
    // If it's in the past, don't count it
    return false;
  }).length;
  
  const renderEmptyState = () => (
    <div className="empty-container">
      <div className="empty-icon">
        <FontAwesomeIcon icon={faCalendarDay} size="3x" color="#3498db" />
      </div>
      <h3 className="empty-text">No availability defined</h3>
      <p className="empty-subtext">
        Add your first availability slots by clicking the button below
      </p>
      <div className="empty-state-steps">
        <div className="empty-state-step">
          <div className="step-circle"><span className="step-number">1</span></div>
          <span className="step-text">Click "Add Availability Slots"</span>
        </div>
        <div className="empty-state-step">
          <div className="step-circle"><span className="step-number">2</span></div>
          <span className="step-text">Select dates and times</span>
        </div>
        <div className="empty-state-step">
          <div className="step-circle"><span className="step-number">3</span></div>
          <span className="step-text">Save to make yourself available</span>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="availability-container">
      <div className="header">
        <h2 className="page-title">Availability</h2>
        {!loading && availabilities.length > 0 && (
          <div className="stats">
            <div className="stat-item">
              <span className="stat-value">{futureAvailabilitiesCount}</span>
              <span className="stat-label">Available Slots</span>
            </div>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p className="loading-text">Loading your schedule...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">
            <FontAwesomeIcon icon={faExclamationTriangle} size="2x" color="#e74c3c" />
          </div>
          <p className="error-text">{error}</p>
          <button className="retry-button" onClick={() => fetchAvailabilities()}>
            Retry
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
                      <span className="time-text">{availability.startTime} - {availability.endTime}</span>
                      {isToday(parseISO(availability.date)) && (
                        <span className="today-badge">Today</span>
                      )}
                    </div>
                    {availability.isBooked && (
                      <div className="booked-badge">
                        <FontAwesomeIcon icon={faCalendarDay} className="booked-icon" size="sm" />
                        <span className="booked-text">Booked</span>
                      </div>
                    )}
                  </div>
                  
                  {!availability.isBooked && (
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteAvailability(availability._id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      
      <Link to="/doctor/availability/create" className="add-button">
        <FontAwesomeIcon icon={faCalendarPlus} className="add-icon" />
        <span className="add-button-text">Add Availability Slots</span>
      </Link>
    </div>
  );
};

export default AvailabilityList;