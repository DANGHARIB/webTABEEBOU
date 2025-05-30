import { Outlet, NavLink } from 'react-router-dom';


import './PatientLayout.css';

function PatientLayout() {
  // Logout functionality has been removed from this component's sidebar.
  // If needed elsewhere, it should be re-implemented there.

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Tabeebou.com</h2>
          <p>Patient Area</p>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li>
              <NavLink 
                to="/patient/profile" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">👤</span>
                <span>Profile</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/patient/appointment" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">📅</span>
                <span>Appointments</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/patient/doctor" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">👨‍⚕️</span>
                <span>Doctors</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/patient/payment" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">💳</span>
                <span>Payments</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/patient/search" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">🔍</span>
                <span>Search</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="content-header">
          <h2>Patient Area</h2>
          {/* You can add header elements like notifications or a user menu here */}
        </header>
        
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default PatientLayout; 