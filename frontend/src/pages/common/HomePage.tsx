import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './HomePage.css';

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Bienvenue sur MediConsult</h1>
        <p>La plateforme qui connecte les patients et les médecins</p>

        {user ? (
          <div className="auth-buttons">
            <Link 
              to={user.role === 'Patient' ? '/patient' : '/doctor'} 
              className="primary-button"
            >
              Accéder à mon tableau de bord
            </Link>
          </div>
        ) : (
          <div className="auth-buttons">
            <div className="user-type-container">
              <h2>Je suis un patient</h2>
              <div className="button-group">
                <Link to="/patient/auth/login" className="primary-button">Connexion</Link>
                <Link to="/patient/auth/register" className="secondary-button">Inscription</Link>
              </div>
            </div>
            
            <div className="user-type-container">
              <h2>Je suis un médecin</h2>
              <div className="button-group">
                <Link to="/doctor/auth/login" className="primary-button">Connexion</Link>
                <Link to="/doctor/auth/register" className="secondary-button">Inscription</Link>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="features-section">
        <h2>Nos fonctionnalités</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Prise de rendez-vous en ligne</h3>
            <p>Planifiez vos consultations rapidement et facilement.</p>
          </div>
          <div className="feature-card">
            <h3>Dossiers médicaux sécurisés</h3>
            <p>Accédez à votre historique médical en toute sécurité.</p>
          </div>
          <div className="feature-card">
            <h3>Téléconsultation</h3>
            <p>Consultez votre médecin depuis le confort de votre domicile.</p>
          </div>
          <div className="feature-card">
            <h3>Gestion d'agenda pour médecins</h3>
            <p>Optimisez votre emploi du temps professionnel.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage; 