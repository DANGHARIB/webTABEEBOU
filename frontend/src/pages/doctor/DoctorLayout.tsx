import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import './DoctorLayout.css';

function DoctorLayout() {
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
          <p>Espace Médecin</p>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li>
              <NavLink 
                to="/doctor" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                end
              >
                <span className="nav-icon">📊</span>
                <span>Tableau de bord</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/doctor/availability" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">📅</span>
                <span>Disponibilités</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/doctor/patient" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">👤</span>
                <span>Patients</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/doctor/notes" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">📝</span>
                <span>Notes médicales</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/doctor/payment" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">💰</span>
                <span>Revenus</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/doctor/profile" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">⚙️</span>
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
          <h2>Dashboard Médecin</h2>
          {/* Vous pouvez ajouter des éléments d'en-tête comme des notifications ou un menu utilisateur ici */}
        </header>
        
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DoctorLayout; 