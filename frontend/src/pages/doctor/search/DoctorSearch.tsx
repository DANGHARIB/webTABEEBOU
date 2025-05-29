import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faChevronRight, faCheckCircle, faExclamationCircle, faUser, faUserCircle } from '@fortawesome/free-solid-svg-icons';
import './DoctorSearch.css';

// Types
type Patient = {
  _id: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  has_taken_assessment: boolean;
  user?: {
    fullName: string;
    email: string;
  }
};

// Dummy patients data for demonstration
const DUMMY_PATIENTS: Patient[] = [
  {
    _id: '1',
    first_name: 'John',
    last_name: 'Doe',
    gender: 'male',
    date_of_birth: '1985-06-15',
    has_taken_assessment: true,
    user: {
      fullName: 'John Doe',
      email: 'john.doe@example.com'
    }
  },
  {
    _id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    gender: 'female',
    date_of_birth: '1990-03-22',
    has_taken_assessment: false,
    user: {
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com'
    }
  },
  {
    _id: '3',
    first_name: 'Michael',
    last_name: 'Johnson',
    gender: 'male',
    date_of_birth: '1978-11-08',
    has_taken_assessment: true,
    user: {
      fullName: 'Michael Johnson',
      email: 'michael.johnson@example.com'
    }
  }
];

const DoctorSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPatients(DUMMY_PATIENTS);
      setFilteredPatients(DUMMY_PATIENTS);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient => 
        (patient.first_name && patient.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (patient.last_name && patient.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (patient.user?.fullName && patient.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  const handleSearch = () => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
      return;
    }

    // In a real app, you might make an API call here
    const filtered = patients.filter(patient => 
      (patient.first_name && patient.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (patient.last_name && patient.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (patient.user?.fullName && patient.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredPatients(filtered);
  };

  const handleViewPatient = (patientId: string) => {
    // Redirect to patient detail page
    navigate(`/doctor/patient/${patientId}`);
  };

  const getPatientName = (patient: Patient) => {
    if (patient.user?.fullName) return patient.user.fullName;
    if (patient.first_name || patient.last_name) {
      return `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    }
    return 'Patient without name';
  };

  const calculateAge = (dateOfBirth?: string): string => {
    if (!dateOfBirth) return 'Unknown age';
    
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return `${age} years`;
  };

  return (
    <div className="doctor-search">
      <div className="search-header">
        <h1 className="page-title">Patients</h1>
      </div>

      <div className="search-container">
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search by name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        {searchQuery !== '' && (
          <button className="clear-button" onClick={() => setSearchQuery('')}>
            &times;
          </button>
        )}
      </div>

      <div className="patients-container">
        {loading ? (
          <div className="loading-container">
            <div className="loader"></div>
            <p className="loading-text">Loading patients...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <FontAwesomeIcon icon={faExclamationCircle} className="error-icon" />
            <p className="error-text">{error}</p>
            <button className="retry-button" onClick={() => setLoading(true)}>
              Retry
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="empty-container">
            <FontAwesomeIcon icon={faSearch} className="empty-icon" />
            <h3 className="no-results">No patients found</h3>
            <p className="no-results-hint">Try a different search term or check your connection</p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <button 
              key={patient._id} 
              className="patient-card"
              onClick={() => handleViewPatient(patient._id)}
            >
              <div className="patient-card-content">
                <div className="patient-image">
                  <FontAwesomeIcon icon={faUserCircle} className="patient-icon" />
                </div>
                <div className="patient-info">
                  <h3 className="patient-name">
                    {getPatientName(patient)}
                  </h3>
                  <p className="patient-details">
                    {patient.gender ? `${patient.gender} • ` : ''}
                    {patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'Unknown age'}
                  </p>
                  {patient.has_taken_assessment && (
                    <div className="assessment-badge">
                      <FontAwesomeIcon icon={faCheckCircle} className="assessment-icon" />
                      <span className="assessment-text">Assessment completed</span>
                    </div>
                  )}
                </div>
                <div className="arrow-container">
                  <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorSearch;
