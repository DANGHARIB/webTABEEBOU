import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import './PatientLayout.css';

function PatientLayout() {
  const { logout } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    addNotification('Vous avez été déconnecté avec succès', 'success');
    navigate('/');
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>MediConsult</h2>
          <p>Espace Patient</p>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li>
              <NavLink 
                to="/patient" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                end
              >
                <span className="nav-icon">📊</span>
                <span>Tableau de bord</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/patient/appointment" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">📅</span>
                <span>Rendez-vous</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/patient/doctor" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">👨‍⚕️</span>
                <span>Médecins</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/patient/payment" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">💳</span>
                <span>Paiements</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/patient/profile" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">👤</span>
                <span>Profil</span>
              </NavLink>
            </li>
            <li className="logout-item">
              <button className="nav-link logout-btn" onClick={handleLogout}>
                <span className="nav-icon">🚪</span>
                <span>Déconnexion</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="content-header">
          <h2>Dashboard Patient</h2>
          {/* Vous pouvez ajouter des éléments d'en-tête comme des notifications ou un menu utilisateur ici */}
        </header>
        
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default PatientLayout; 