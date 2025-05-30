import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PatientAdditionalDetails.css';

const PatientAdditionalDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'Male', // Default value
    day: '',
    month: '',
    year: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const email = params.get('email');
    const firstName = params.get('firstName');
    const lastName = params.get('lastName');

    if (email && firstName && lastName) {
      setFormData(prev => ({
        ...prev,
        email,
        firstName,
        lastName,
      }));
    } else {
      // Handle case where params are missing, maybe redirect or show error
      setError('User details are missing. Please start registration again.');
      // navigate('/patient/auth/register'); // Optionally redirect
    }
  }, [location.search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gender || !formData.day || !formData.month || !formData.year) {
      setError('Please fill all fields');
      return;
    }

    const dateOfBirth = `${formData.year}-${String(formData.month).padStart(2, '0')}-${String(formData.day).padStart(2, '0')}`;

    // Validate date (basic validation)
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
        setError('Invalid date of birth.');
        return;
    }
    if (parseInt(formData.year) < 1900 || parseInt(formData.year) > new Date().getFullYear()) {
        setError('Invalid year of birth.');
        return;
    }

    setError('');
    setIsLoading(true);

    try {
      const patientDetailsToStore = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        dateOfBirth: dateOfBirth,
      };

      localStorage.setItem('tempPatientDetails', JSON.stringify(patientDetailsToStore));
      
      // Navigate to OTP verification page, passing email
      navigate(`/patient/auth/verify-otp?email=${encodeURIComponent(formData.email)}`);

    } catch (err) {
      console.error('Failed to save details locally:', err);
      setError('Failed to save details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = [
    { label: 'January', value: '01' }, { label: 'February', value: '02' }, { label: 'March', value: '03' },
    { label: 'April', value: '04' }, { label: 'May', value: '05' }, { label: 'June', value: '06' },
    { label: 'July', value: '07' }, { label: 'August', value: '08' }, { label: 'September', value: '09' },
    { label: 'October', value: '10' }, { label: 'November', value: '11' }, { label: 'December', value: '12' },
  ];

  if (!formData.email) { // Show loading or error if email (and other params) not yet loaded
    return <div className="loading-container login-container"><p>{error || 'Loading details...'}</p></div>;
  }

  return (
    <div className="additional-details-container login-container">
      <div className="additional-details-card login-card">
        <h2>Patient&apos;s Details</h2>
        <p className="subtitle">
          Welcome, {formData.firstName} {formData.lastName}! Please complete your profile.
        </p>

        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select 
              name="gender" 
              id="gender" 
              value={formData.gender} 
              onChange={handleChange} 
              className="form-input"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <div className="date-select-group">
              <select name="day" value={formData.day} onChange={handleChange} required className="form-input date-select">
                <option value="">Day</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select name="month" value={formData.month} onChange={handleChange} required className="form-input date-select">
                <option value="">Month</option>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select name="year" value={formData.year} onChange={handleChange} required className="form-input date-select">
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="submit-button login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'SAVE DETAILS & PROCEED TO OTP'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientAdditionalDetails;
