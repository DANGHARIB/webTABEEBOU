import { Outlet, NavLink } from 'react-router-dom';
import './DoctorLayout.css';

function DoctorLayout() {

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>MediConsult</h2>
          <p>Doctor Portal</p>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li>
              <NavLink 
                to="/doctor/search" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">🔍</span>
                <span>Search</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/doctor/payments" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">💰</span>
                <span>Payments</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/doctor/appointment" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">📅</span>
                <span>Appointments</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/doctor/profile" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-icon">⚙️</span>
                <span>Profile</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="content-header">
          <h2>Doctor Portal</h2>
          {/* You can add header elements such as notifications or a user menu here */}
        </header>
        
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DoctorLayout; 