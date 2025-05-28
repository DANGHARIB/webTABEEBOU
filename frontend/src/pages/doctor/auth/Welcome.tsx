import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';

const WelcomeDoctorScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <div className="check-icon">✓</div>
        <h1 className="welcome-title">WELCOME DOCTOR!</h1>
        <p className="welcome-message">
          Your profile has been successfully verified. You can now log in to access your dashboard, manage appointments, and connect with your patients.
        </p>
        <button 
          className="continue-button"
          onClick={() => navigate('/doctor/auth/details')}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default WelcomeDoctorScreen; 