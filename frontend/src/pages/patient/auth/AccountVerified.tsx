import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import './AccountVerified.css'; // We'll create this

const AccountVerified: React.FC = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    // Navigate to the patient dashboard or a relevant landing page after login
    navigate('/patient'); // Assuming '/patient' is the dashboard route
  };

  return (
    <div className="verified-container login-container">
      <div className="verified-card login-card">
        <FaCheckCircle className="verified-icon" />
        <h2>Account Verified!</h2>
        <p className="subtitle">
          Your account has been successfully created and verified.
        </p>
        <p className="message">
          You can now proceed to your dashboard.
        </p>
        <button 
          onClick={handleContinue}
          className="continue-button login-button"
        >
          CONTINUE TO DASHBOARD
        </button>
      </div>
    </div>
  );
};

export default AccountVerified;
