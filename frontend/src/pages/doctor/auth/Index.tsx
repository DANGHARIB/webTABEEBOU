import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Index.css';

const DoctorAuthScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="content-container">
        <h1 className="auth-title">Welcome to</h1>
        <h2 className="auth-subtitle">TABEEBOU.COM</h2>
        
        <div className="description-container">
          <p className="auth-description">CONVENIENT CROSS BORDERS</p>
          <p className="auth-description">TELEHEALTH SOLUTION</p>
          <p className="auth-description">JUST FOR YOU</p>
        </div>
      </div>

      <div className="button-container">
        <button 
          className="auth-button" 
          onClick={() => navigate('/doctor/auth/login')}
        >
          Login
        </button>
        
        <button 
          className="auth-button"
          onClick={() => navigate('/doctor/auth/signup')}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default DoctorAuthScreen; 