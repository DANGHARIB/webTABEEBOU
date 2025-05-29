import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays, faSpinner, faVideo, faFileAlt,
  faCheckCircle, faCalendarCheck, faTimesCircle, faClock, 
  faChevronLeft, faChevronRight, faSync
} from '@fortawesome/free-solid-svg-icons';

import './DoctorAppointment.css';
import { useAuth } from '../../../hooks/useAuth';
import { doctorAPI } from '../../../services/api';
import type { Appointment } from '../../../types/api.types';

// Constants for styling
const COLORS = {
  primary: '#7AA7CC',
  primaryLight: '#8FB5D5',
  primaryDark: '#6999BE',
  secondary: '#F8FAFC',
  accent: '#7AA7CC',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  purple: '#8B5CF6',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#090F47',
  white: '#FFFFFF',
  background: '#FAFBFE',
};

// Constants for scroll calculation
const DATE_OPTION_WIDTH = 56;
const DATE_OPTION_MARGIN = 12;
const DATE_SELECTOR_PADDING = 16;

// Format display time (12-hour format with AM/PM)
const formatDisplayTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':');
    const hour = Number(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time;
  }
};

const DoctorAppointment: React.FC = () => {
  // const { user } = useAuth(); // Auth will be used in future iterations
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [dateOptions, setDateOptions] = useState<Date[]>([]);
  
  // Ref for date selector
  const dateScrollRef = useRef<HTMLDivElement>(null);

  // Generate date options for the current week
  useEffect(() => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
    const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    setDateOptions(dates);
  }, [currentWeek]);
  
  // Load appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        console.log('Fetching doctor appointments...');
        const response = await doctorAPI.getAppointments();
        
        if (response.success && Array.isArray(response.data)) {
          console.log('Appointments fetched successfully:', response.data.length);
          setAppointments(response.data);
        } else if (Array.isArray(response)) {
          console.log('Appointments fetched successfully:', response.length);
          setAppointments(response);
        } else {
          console.log('No appointments found or invalid response format');
          setAppointments([]);
        }
      } catch (err) {
        console.error('Error loading appointments:', err);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  // Auto-scroll to selected date
  const scrollToSelectedDate = useCallback((targetDate: Date) => {
    const selectedIndex = dateOptions.findIndex(date => 
      format(date, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd')
    );
    
    if (selectedIndex > -1 && dateScrollRef.current) {
      // Calculate scroll position to center the selected date or show upcoming days
      const scrollLeft = Math.max(0, selectedIndex * (DATE_OPTION_WIDTH + DATE_OPTION_MARGIN) - DATE_SELECTOR_PADDING);
      
      dateScrollRef.current.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [dateOptions]);

  // Effect to auto-scroll when selectedDate changes (including week changes)
  useEffect(() => {
    if (dateOptions.length > 0) {
      // Delay the scroll to ensure the ScrollView is rendered
      setTimeout(() => {
        scrollToSelectedDate(selectedDate);
      }, 100);
    }
  }, [dateOptions, selectedDate, scrollToSelectedDate]);

  // Check if current week is this week
  const isCurrentCalendarWeek = isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 });

  // Navigation functions for weeks
  const goToPreviousWeek = () => {
    const newWeek = subWeeks(currentWeek, 1);
    const today = new Date();
    
    // Check if the new week is the current week
    if (isSameWeek(newWeek, today, { weekStartsOn: 1 })) {
      // For the current week, select the current day
      setCurrentWeek(newWeek);
      setSelectedDate(today);
    } else {
      // For other weeks, select Monday
      const mondayOfNewWeek = startOfWeek(newWeek, { weekStartsOn: 1 });
      setCurrentWeek(newWeek);
      setSelectedDate(mondayOfNewWeek);
    }
  };

  const goToNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1);
    const today = new Date();
    
    // Check if the new week is the current week
    if (isSameWeek(newWeek, today, { weekStartsOn: 1 })) {
      // For the current week, select the current day
      setCurrentWeek(newWeek);
      setSelectedDate(today);
    } else {
      // For other weeks, select Monday
      const mondayOfNewWeek = startOfWeek(newWeek, { weekStartsOn: 1 });
      setCurrentWeek(newWeek);
      setSelectedDate(mondayOfNewWeek);
    }
  };

  const goToCurrentWeek = () => {
    // For the current week, always select the current day
    const today = new Date();
    setCurrentWeek(today);
    setSelectedDate(today);
  };
  
  // Handle date selection with auto-scroll
  const handleDateSelection = (date: Date) => {
    setSelectedDate(date);
    scrollToSelectedDate(date);
  };

  // Filter appointments by date
  const getAppointmentsForDate = (date = selectedDate) => {
    if (!appointments.length) return [];
    
    const formattedSelectedDate = format(date, 'yyyy-MM-dd');
    
    return appointments.filter(appointment => {
      try {
        if (!appointment.availability || !appointment.availability.date) {
          return false;
        }
        const appointmentDate = appointment.availability.date;
        return appointmentDate.includes(formattedSelectedDate);
      } catch (err) {
        console.error('Error filtering appointment by date:', err, appointment);
        return false;
      }
    });
  };

  // Get appointments for today (for stats)
  const getTodayAppointments = () => {
    return getAppointmentsForDate(new Date());
  };

  // Get patient full name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getPatientName = (patient: any) => {  // Using any because Patient interface structure varies
    if (!patient) return 'Patient';
    return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
  };

  // Check if an appointment can be rescheduled (up to 1 day before)
  const canRescheduleAppointment = (appointmentDate: string) => {
    try {
      // Convert the appointment date to a Date object
      const appDate = new Date(appointmentDate);
      // Rescheduling deadline = appointment date - 1 day
      const rescheduleDeadline = new Date(appDate);
      rescheduleDeadline.setDate(appDate.getDate() - 1);
      
      // Compare with current date
      const now = new Date();
      
      // Can reschedule if current date is before the rescheduling deadline
      return now <= rescheduleDeadline;
    } catch (error) {
      console.error('Error checking reschedule date:', error);
      return false;
    }
  };

  // Check if an appointment is past (end slot is passed)
  const isAppointmentPast = (appointment: Appointment) => {
    try {
      const now = new Date();
      const appointmentDate = new Date(appointment.availability.date);
      const [hours, minutes] = appointment.slotEndTime.split(':').map(Number);
      
      appointmentDate.setHours(hours, minutes, 0, 0);
      
      return now > appointmentDate;
    } catch (error) {
      console.error('Error checking appointment date:', error);
      return false;
    }
  };

  // Navigate to notes page
  const navigateToNotes = async (appointment: Appointment) => {
    try {
      console.log('Checking if note exists for appointment:', appointment._id);
      
      try {
        // Call the API to check if a note exists
        const response = await doctorAPI.checkNoteExists(appointment._id);
        console.log('Note check response:', response);
        
        // Get the existence and noteId from the response
        const exists = response?.exists || false;
        const noteId = response?.noteId || null;
        
        console.log('Note exists:', exists, 'Note ID:', noteId);
        
        if (exists && noteId) {
          // If a note exists, navigate to edit the note
          console.log('Navigating to edit note:', noteId);
          navigate(`/doctor/notes/${noteId}`);
          return;
        }
      } catch (err) {
        console.error('Error checking note existence:', err);
        console.log('Note check endpoint not available, proceeding to create new note');
        // Continue to create new note if endpoint doesn't exist
      }
      
      // Default to creating a new note
      console.log('Navigating to create new note for appointment:', appointment._id);
      navigate(`/doctor/notes/create?appointmentId=${appointment._id}`);
    } catch (error) {
      console.error('Error navigating to notes:', error);
      navigate(`/doctor/notes/create?appointmentId=${appointment._id}`);
    }
  };

  // Handle reschedule request
  const handleRescheduleRequest = async (appointment: Appointment) => {
    if (!appointment.availability || !appointment.availability.date || !canRescheduleAppointment(appointment.availability.date)) {
      alert("This appointment cannot be rescheduled as it is scheduled in less than 24 hours.");
      return;
    }
    
    if (window.confirm(`Are you sure you want to ask the patient to reschedule their appointment on ${format(parseISO(appointment.availability.date), 'dd/MM/yyyy')} at ${appointment.slotStartTime}?`)) {
      try {
        setLoading(true);
        const response = await doctorAPI.requestRescheduleAppointment(appointment._id);
        
        if (response.success && response.data) {
          alert("A notification has been sent to the patient asking them to reschedule this appointment.");
          // Refresh appointments
          const updatedResponse = await doctorAPI.getAppointments();
          if (updatedResponse.success && Array.isArray(updatedResponse.data)) {
            setAppointments(updatedResponse.data);
          } else if (Array.isArray(updatedResponse)) {
            setAppointments(updatedResponse);
          }
        } else {
          alert(`Error: ${response.message || 'Could not request reschedule.'}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to request reschedule.';
        console.error("Error requesting rescheduling:", error);
        alert(`An error occurred: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Open session link
  const openSessionLink = (link?: string) => {
    if (!link) {
      alert("No consultation link is available for this appointment.");
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Get status configuration for UI rendering
  const getStatusConfig = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return {
          color: COLORS.primary,
          text: 'Confirmed',
          icon: faCheckCircle,
          colorClass: 'status-confirmed'
        };
      case 'completed':
        return {
          color: COLORS.success,
          text: 'Completed',
          icon: faCalendarCheck,
          colorClass: 'status-completed'
        };
      case 'cancelled':
        return {
          color: COLORS.danger,
          text: 'Cancelled',
          icon: faTimesCircle,
          colorClass: 'status-cancelled'
        };
      case 'rescheduled':
        return {
          color: COLORS.purple,
          text: 'Rescheduled',
          icon: faCalendarDays,
          colorClass: 'status-rescheduled'
        };
      case 'reschedule_requested':
        return {
          color: COLORS.warning,
          text: 'Reschedule Req.',
          icon: faClock,
          colorClass: 'status-reschedule-req'
        };
      case 'pending':
      default:
        return {
          color: COLORS.warning,
          text: 'Pending',
          icon: faClock,
          colorClass: 'status-pending'
        };
    }
  };
  
  // Get payment status configuration for UI rendering
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getPaymentConfig = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'completed':
        return {
          color: COLORS.success,
          text: 'Paid',
          icon: faCheckCircle
        };
      case 'refunded':
        return {
          color: COLORS.warning,
          text: 'Refunded',
          icon: faSync
        };
      case 'failed':
        return {
          color: COLORS.danger,
          text: 'Failed',
          icon: faTimesCircle
        };
      case 'pending':
      default:
        return {
          color: COLORS.warning,
          text: 'Pending',
          icon: faClock
        };
    }
  };

  // Render week navigation header
  const renderWeekNavigation = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekRange = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;

    return (
      <div className="week-navigation">
        <button className="week-nav-btn" onClick={goToPreviousWeek}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        
        <div className="week-info">
          <button className="week-range-button" onClick={goToCurrentWeek}>
            <FontAwesomeIcon icon={faCalendarDays} className="week-range-icon" />
            <span className="week-range-text">{weekRange}</span>
            {!isCurrentCalendarWeek && (
              <div className="current-week-indicator">
                <span className="current-week-text">Go to current</span>
              </div>
            )}
          </button>
        </div>
        
        <button className="week-nav-btn" onClick={goToNextWeek}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    );
  };

  // Render date selector
  const renderDateSelector = () => {
    return (
      <div className="date-selector-container">
        <div className="date-selector" ref={dateScrollRef}>
          {dateOptions.map((date, index) => {
            const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            return (
              <button
                key={index}
                className={`date-option ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleDateSelection(date)}
              >
                <span className="day-name">{format(date, 'EEE', { locale: enUS })}</span>
                <span className="day-number">{format(date, 'dd')}</span>
                {isToday && !isSelected && <span className="today-indicator"></span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render appointments list with timeline design
  const renderAppointments = () => {
    const filteredAppointments = getAppointmentsForDate(selectedDate);
    
    // Sort appointments by time
    filteredAppointments.sort((a, b) => {
      return a.slotStartTime.localeCompare(b.slotStartTime);
    });
    
    if (loading) {
      return (
        <div className="loading-container">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" className="loading-spinner" />
          <p className="loading-text">Loading appointments...</p>
        </div>
      );
    }
    
    if (!filteredAppointments.length) {
      const dateText = format(selectedDate, 'MMMM dd, yyyy');
      return (
        <div className="empty-container">
          <FontAwesomeIcon icon={faCalendarCheck} size="3x" className="empty-icon" />
          <p className="empty-text">No appointments scheduled for {dateText}</p>
        </div>
      );
    }
    
    return (
      <div className="appointments-list">
        {filteredAppointments.map((appointment, index) => {
          const statusConfig = getStatusConfig(appointment.status);
          const isPast = isAppointmentPast(appointment);
          
          return (
            <div key={appointment._id} className="appointment-item">
              <div className="time-section">
                <div className="time-block">
                  <span className="time-text">{formatDisplayTime(appointment.slotStartTime)}</span>
                </div>
                <div className={`time-indicator ${statusConfig.colorClass}`}></div>
                {index < filteredAppointments.length - 1 && <div className="time-connector"></div>}
              </div>
              <div className="appointment-card">
                <div className="card-header">
                  <div className="patient-info">
                    <h3 className="patient-name">{getPatientName(appointment.patient)}</h3>
                    <span className="appointment-status">{statusConfig.text}</span>
                  </div>
                  <div className="appointment-type">
                    {appointment.caseDetails || 'General Consultation'}
                  </div>
                </div>
                
                <div className="action-buttons">
                  {appointment.status !== 'cancelled' && (
                    <button 
                      className="action-button notes-button"
                      onClick={() => navigateToNotes(appointment)}
                    >
                      <FontAwesomeIcon icon={faFileAlt} />
                      <span>Notes</span>
                    </button>
                  )}
                  
                  {appointment.sessionLink && !isPast && appointment.status !== 'cancelled' && (
                    <button
                      className="action-button video-button"
                      onClick={() => openSessionLink(appointment.sessionLink)}
                    >
                      <FontAwesomeIcon icon={faVideo} />
                      <span>Join Call</span>
                    </button>
                  )}
                  
                  {['confirmed', 'scheduled'].includes(appointment.status) && 
                   !isPast && canRescheduleAppointment(appointment.availability.date) && (
                    <button 
                      className="action-button reschedule-button"
                      onClick={() => handleRescheduleRequest(appointment)}
                    >
                      <FontAwesomeIcon icon={faCalendarDays} />
                      <span>Reschedule</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="doctor-appointment">
      <div className="appointment-header">
        <h1 className="page-title">Appointments</h1>
        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-number">{getTodayAppointments().length}</span>
            <span className="stat-label">Today's appointments</span>
          </div>
        </div>
      </div>
      
      {renderWeekNavigation()}
      {renderDateSelector()}
      
      <div className="appointments-container">
        {renderAppointments()}
      </div>
    </div>
  );
};

export default DoctorAppointment;
