import { Link } from 'react-router-dom';
import './HomePage.css';
import logo from '../../assets/logo.png';

function HomePage() {
  return (
    <div className="home-container">
      <div className="content-wrapper">
        <div className="left-content">
          <div className="logo-section">
            <img src={logo} alt="TABEEBOU Logo" className="logo" />
            <h1 className="site-title">TABEEBOU.COM</h1>
          </div>
        </div>
        
        <div className="right-content">
          <div className="welcome-section">
            <h1 className="welcome-title">Welcome to<br />TABEEBOU.COM</h1>
            <p className="welcome-subtitle">
              CONVENIENT CROSS BORDERS<br />
              TELEHEALTH SOLUTION<br />
              JUST FOR YOU
            </p>
            
            <div className="button-section">
              <Link to="/patient/auth/login" className="user-button patient-button">
                I am a Patient
              </Link>
              <Link to="/doctor/auth" className="user-button doctor-button">
                I am a Doctor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;