import { useNavigate } from 'react-router-dom';
import './Index.css';
import logo from '../../../assets/logo.png';

const PatientAuthScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-content-wrapper">
        <div className="auth-left-content">
          <div className="auth-logo-section">
            <img src={logo} alt="TABEEBOU Logo" className="auth-logo" />
            <h1 className="auth-site-title">TABEEBOU.COM</h1>
          </div>
        </div>
        
        <div className="auth-right-content">
          <div className="auth-welcome-section">
            <h1 className="auth-welcome-title">Welcome to<br />TABEEBOU.COM</h1>
            <p className="auth-welcome-subtitle">
              CONVENIENT CROSS BORDERS<br />
              TELEHEALTH SOLUTION<br />
              JUST FOR YOU
            </p>
            
            <div className="auth-button-section">
              <button 
                className="auth-user-button" 
                onClick={() => navigate('/patient/auth/login')}
              >
                Login
              </button>
              
              <button 	
                className="auth-user-button"
                onClick={() => navigate('/patient/auth/register')}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientAuthScreen;
