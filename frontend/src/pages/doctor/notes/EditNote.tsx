import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faSave, 
  faExclamationTriangle,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

import { doctorAPI } from '../../../services/api';
import './Notes.css';

// Import types defined in api.ts via the doctorAPI export
type AppointmentNote = ReturnType<typeof doctorAPI.getNoteById> extends Promise<infer T> ? T : never;
type NotePatient = Exclude<AppointmentNote['patient'], string>;

const EditNote: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<AppointmentNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formTouched, setFormTouched] = useState(false);
  
  // Note fields
  const [content, setContent] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');

  // Load note details
  useEffect(() => {
    const fetchNoteDetails = async () => {
      if (!id) {
        navigate('/doctor/appointments');
        return;
      }
      
      try {
        setLoading(true);
        console.log('Fetching note with ID:', id);
        const noteData = await doctorAPI.getNoteById(id);
        console.log('Note response:', noteData);
        
        if (noteData && noteData._id) {
          console.log('Note data loaded successfully:', noteData);
          
          // Set note data
          setNote(noteData);
          
          // Initialize fields with existing data
          setContent(noteData.content || '');
          setDiagnosis(noteData.diagnosis || '');
          setTreatment(noteData.treatment || '');
          setAdvice(noteData.advice || '');
          setFollowUp(noteData.followUp || '');
        } else {
          console.error('Invalid or empty note data:', noteData);
          throw new Error('Failed to load note details');
        }
      } catch (error) {
        console.error('Error loading note:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        alert('Unable to load note details. Redirecting to appointments page.');
        navigate('/doctor/appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchNoteDetails();
  }, [id, navigate]);

  // Format appointment date
  const formatAppointmentDate = (note: AppointmentNote) => {
    if (!note || typeof note.appointment === 'string' || !note.appointment.availability || !note.appointment.availability.date) {
      return 'Unknown date';
    }
    
    try {
      const date = new Date(note.appointment.availability.date);
      return format(date, 'MM/dd/yyyy');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  // Get patient name
  const getPatientName = (patient: NotePatient | string | undefined) => {
    if (!patient) return 'Patient';
    if (typeof patient === 'string') return 'Patient ID: ' + patient;
    if (patient.user?.fullName) return patient.user.fullName;
    return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
  };

  // Form validation
  const validateForm = () => {
    if (!content.trim()) {
      setError('Please enter note content');
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
      console.log('Updating note with ID:', id);
      const updatedNote = await doctorAPI.updateAppointmentNote(id!, {
        content,
        diagnosis,
        treatment,
        advice,
        followUp
      });
      
      console.log('Note update response:', updatedNote);
      
      if (updatedNote && updatedNote._id) {
        setSuccess('Note updated successfully!');
        // Show success message for 1.5 seconds before navigating
        setTimeout(() => {
          navigate('/doctor/appointment');
        }, 1500);
      } else {
        throw new Error('Failed to update note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(`Failed to save note: ${errorMessage}`);
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
        <p className="loading-text">Loading note...</p>
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
        <h1 className="notes-title">Edit Note</h1>
      </div>
      
      {note && note.appointment && (
        <div className="appointment-info-card">
          <h2 className="card-title">Appointment Details</h2>
          
          <div className="info-row">
            <span className="info-label">Patient:</span>
            <span className="info-value">{getPatientName(note.patient)}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Date:</span>
            <span className="info-value">{formatAppointmentDate(note)}</span>
          </div>
          
          {typeof note.appointment !== 'string' && (
            <>
              <div className="info-row">
                <span className="info-label">Time:</span>
                <span className="info-value">
                  {note.appointment.slotStartTime} - {note.appointment.slotEndTime}
                </span>
              </div>
              
              {note.appointment.caseDetails && (
                <div className="info-row">
                  <span className="info-label">Reason:</span>
                  <span className="info-value">{note.appointment.caseDetails}</span>
                </div>
              )}
            </>
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
          title="Save changes to this note"
        >
          {saving ? (
            <div className="saving-indicator">
              <FontAwesomeIcon icon={faSpinner} spin />
              <span>Updating...</span>
            </div>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} />
              <span>Update</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EditNote;
