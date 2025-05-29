import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { doctorAPI } from '../../../services/api';
import './Notes.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faSave, 
  faExclamationTriangle,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

import type { Appointment, Patient as ApiPatient } from '../../../types/api.types';

// Define a simple patient type for the simplified patient objects in appointments
type SimplePatient = {
  _id: string;
  first_name?: string;
  last_name?: string;
  user?: {
    fullName?: string;
    _id?: string;
  };
};

// PatientData can be either the full Patient type or the simplified version
type PatientData = ApiPatient | SimplePatient;

const CreateNote: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const appointmentId = queryParams.get('appointmentId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formTouched, setFormTouched] = useState(false);
  
  // States for note fields
  const [content, setContent] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');

  // Load appointment details
  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (!appointmentId) {
        navigate('/doctor/appointments');
        return;
      }
      
      try {
        setLoading(true);
        console.log('Fetching appointment with ID:', appointmentId);
        const response = await doctorAPI.getAppointmentById(appointmentId);
        console.log('API response:', response);
        
        // Process the appointment data
        if (response && response._id) {
          console.log('Appointment data loaded successfully:', response);
          setAppointment(response);
        } else {
          console.error('Invalid or empty appointment data:', response);
          throw new Error('Failed to load appointment details');
        }
      } catch (error) {
        // Log detailed error information
        console.error('Error loading appointment:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        
        // Only show alert if we're in a browser environment
        if (typeof window !== 'undefined') {
          alert('Unable to load appointment details. Check console for more information.');
        }
        
        // Navigate back to appointments page
        navigate('/doctor/appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [appointmentId, navigate]);

  // Format appointment date
  const formatAppointmentDate = (appointment: Appointment | null) => {
    if (!appointment || !appointment.availability || !appointment.availability.date) {
      return 'Unknown date';
    }
    
    try {
      const date = new Date(appointment.availability.date);
      return format(date, 'MM/dd/yyyy');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  // Get patient name
  const getPatientName = (patient: PatientData | undefined) => {
    if (!patient) return 'Patient';
    
    // Check if it's a full Patient object with firstName/lastName
    if ('firstName' in patient && 'lastName' in patient) {
      return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
    }
    
    // Check if it has user.fullName
    if ('user' in patient && patient.user?.fullName) {
      return patient.user.fullName;
    }
    
    // Check if it's a simple patient object with first_name/last_name
    if ('first_name' in patient || 'last_name' in patient) {
      return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
    }
    
    return 'Patient';
  };

  // Form validation
  const validateForm = () => {
    if (!content.trim()) {
      setError('Note content cannot be empty.');
      return false;
    }
    return true;
  };

  // Handle form changes
  const handleFormChange = () => {
    if (!formTouched) setFormTouched(true);
    if (error) setError(null);
  };

  // Save note
  const saveNote = async () => {
    // Reset states
    setError(null);
    setSuccess(null);
    
    // Validate form
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const response = await doctorAPI.createAppointmentNote({
        appointmentId,
        content,
        diagnosis,
        treatment,
        advice,
        followUp
      });
      
      if (response.success) {
        setSuccess('Note has been saved successfully!');
        // Show success message for 1.5 seconds before navigating
        setTimeout(() => {
          navigate('/doctor/appointment');
        }, 1500);
      } else {
        throw new Error(response.message || 'Failed to save note');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      let errorMessage = 'Unable to save note';
      if (err instanceof Error) {
        errorMessage = `${errorMessage}: ${err.message}`;
      }
      setError(errorMessage);
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="notes-loading-container">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="loading-spinner" />
        <p className="loading-text">Loading appointment details...</p>
      </div>
    );
  }

  return (
    <div className="notes-container">
      {error && (
        <div className="error-message">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <FontAwesomeIcon icon={faCheck} />
          <span>{success}</span>
        </div>
      )}
      
      <div className="notes-header">
        <h1 className="notes-title">New Note</h1>
      </div>
      
      {appointment && (
        <div className="appointment-info-card">
          <h2 className="card-title">Appointment Details</h2>
          
          <div className="info-row">
            <span className="info-label">Patient:</span>
            <span className="info-value">{getPatientName(appointment.patient)}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Date:</span>
            <span className="info-value">{formatAppointmentDate(appointment)}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Time:</span>
            <span className="info-value">
              {appointment.slotStartTime} - {appointment.slotEndTime}
            </span>
          </div>
          
          {appointment.caseDetails && (
            <div className="info-row">
              <span className="info-label">Reason:</span>
              <span className="info-value">{appointment.caseDetails}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="note-card">
        <div className="note-section">
          <h3 className="section-title">General Notes</h3>
          <textarea
            className="text-area"
            placeholder="Enter your consultation notes..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleFormChange();
            }}
            required
          />
        </div>
        
        <div className="note-section">
          <h3 className="section-title">Diagnosis</h3>
          <input
            type="text"
            className="text-input"
            placeholder="Enter diagnosis"
            value={diagnosis}
            onChange={(e) => {
              setDiagnosis(e.target.value);
              handleFormChange();
            }}
          />
        </div>
        
        <div className="note-section">
          <h3 className="section-title">Prescribed Treatment</h3>
          <textarea
            className="text-area"
            placeholder="Enter prescribed treatment"
            value={treatment}
            onChange={(e) => {
              setTreatment(e.target.value);
              handleFormChange();
            }}
          />
        </div>
        
        <div className="note-section">
          <h3 className="section-title">Advice</h3>
          <textarea
            className="text-area"
            placeholder="Enter advice given to patient"
            value={advice}
            onChange={(e) => {
              setAdvice(e.target.value);
              handleFormChange();
            }}
          />
        </div>
        
        <div className="note-section">
          <h3 className="section-title">Recommended Follow-up</h3>
          <input
            type="text"
            className="text-input"
            placeholder="Enter recommended follow-up"
            value={followUp}
            onChange={(e) => {
              setFollowUp(e.target.value);
              handleFormChange();
            }}
          />
        </div>
      </div>
      
      <div className="action-bar">
        <button 
          className="save-button save-button-full"
          onClick={saveNote}
          disabled={saving}
          title="Save this note"
        >
          {saving ? (
            <div className="saving-indicator">
              <FontAwesomeIcon icon={faSpinner} spin />
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} />
              <span>Save</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateNote;
