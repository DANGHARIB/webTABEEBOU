import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Details.css'; // We can create this later if needed

const PatientAuthDetails: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="details-container login-container">
      <div className="details-card login-card">
        <h2>Registration Successful!</h2>
        <p className="subtitle">
          Thank you for creating an account.
        </p>
        {email && (
          <p className="email-info">
            A confirmation or next steps might be sent to: <strong>{email}</strong>.
          </p>
        )}
        <p>This is a placeholder page for patient account details or next steps after registration.</p>
        <p>Further development will include OTP verification or profile completion.</p>
        
        <div style={{ marginTop: '2rem' }}>
          <Link to="/patient/auth/login" className="login-button" style={{ textDecoration: 'none' }}>
            Proceed to Login
          </Link>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/" className="back-button" style={{ position: 'static', justifyContent: 'center' }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PatientAuthDetails;
