import React from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

const DirectLogin: React.FC = () => {
  return (
    <div className="login-container" style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 className="login-title">Doctor Login</h1>
      <p style={{ marginBottom: '2rem' }}>
        Click the button below to go directly to the doctor profile page.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
        <Link 
          to="/doctor/profile" 
          className="login-button"
          style={{ 
            display: 'block', 
            padding: '1rem', 
            backgroundColor: '#7AA7CC', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}
        >
          Go to Profile Page
        </Link>
        
        <Link 
          to="/doctor/appointment" 
          className="login-button"
          style={{ 
            display: 'block', 
            padding: '1rem', 
            backgroundColor: '#22C55E', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}
        >
          Go to Appointments Page
        </Link>
        
        <Link 
          to="/doctor/search" 
          className="login-button"
          style={{ 
            display: 'block', 
            padding: '1rem', 
            backgroundColor: '#F59E0B', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}
        >
          Go to Search Page
        </Link>
        
        <Link 
          to="/doctor/payments" 
          className="login-button"
          style={{ 
            display: 'block', 
            padding: '1rem', 
            backgroundColor: '#3B82F6', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}
        >
          Go to Payments Page
        </Link>
      </div>
    </div>
  );
};

export default DirectLogin;
