import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useAuth } from './hooks/useAuth';

// Pages communes
import HomePage from './pages/common/HomePage';
import NotFoundPage from './pages/common/NotFoundPage';

// Layouts
import PatientLayout from './pages/patient/PatientLayout';
import DoctorLayout from './pages/doctor/DoctorLayout';

// Pages d'authentification médecin
import DoctorLoginScreen from './pages/doctor/auth/Login.tsx';
import DoctorSignupScreen from './pages/doctor/auth/Signup.tsx';
import DoctorDetailsScreen from './pages/doctor/auth/Details.tsx';
import DoctorAuthIndexScreen from './pages/doctor/auth/Index.tsx';
import DoctorUnderReviewScreen from './pages/doctor/auth/UnderReview.tsx';
import WelcomeDoctorScreen from './pages/doctor/auth/Welcome.tsx';

// Placeholder pour les pages non encore implémentées
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="placeholder-page">
    <h2>{title}</h2>
    <p>Cette page est en cours de développement.</p>
  </div>
);

// Pages de base
const PatientDashboard = () => <PlaceholderPage title="Tableau de bord Patient" />;
const PatientProfile = () => <PlaceholderPage title="Profil Patient" />;
const PatientDoctor = () => <PlaceholderPage title="Recherche de Médecins" />;
const PatientAppointment = () => <PlaceholderPage title="Rendez-vous Patient" />;
const PatientPayment = () => <PlaceholderPage title="Paiements Patient" />;

const DoctorDashboard = () => <PlaceholderPage title="Tableau de bord Médecin" />;
const DoctorProfile = () => <PlaceholderPage title="Profil Médecin" />;
const DoctorAvailability = () => <PlaceholderPage title="Disponibilités" />;
const DoctorPatient = () => <PlaceholderPage title="Mes Patients" />;
const DoctorNotes = () => <PlaceholderPage title="Notes Médicales" />;
const DoctorPayment = () => <PlaceholderPage title="Revenus" />;

// Pages d'authentification patient (placeholders)
const PatientLogin = () => <PlaceholderPage title="Connexion Patient" />;
const PatientRegister = () => <PlaceholderPage title="Inscription Patient" />;

// Composant d'authentification requis pour les routes protégées
function RequireAuth({ children, userType }: { children: React.ReactNode, userType?: string }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Chargement...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (userType && user.role !== userType) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Routes communes */}
            <Route path="/" element={<HomePage />} />
            
            {/* Routes d'authentification patient */}
            <Route path="/patient/auth/login" element={<PatientLogin />} />
            <Route path="/patient/auth/register" element={<PatientRegister />} />
            
            {/* Routes d'authentification médecin */}
            <Route path="/doctor/auth">
              <Route index element={<DoctorAuthIndexScreen />} />
              <Route path="login" element={<DoctorLoginScreen />} />
              <Route path="signup" element={<DoctorSignupScreen />} />
              <Route path="details" element={<DoctorDetailsScreen />} />
              <Route path="under-review" element={<DoctorUnderReviewScreen />} />
              <Route path="welcome" element={<WelcomeDoctorScreen />} />
            </Route>
            
            {/* Routes Patient */}
            <Route path="/patient" element={
              <RequireAuth userType="Patient">
                <PatientLayout />
              </RequireAuth>
            }>
              <Route index element={<PatientDashboard />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="doctor" element={<PatientDoctor />} />
              <Route path="appointment" element={<PatientAppointment />} />
              <Route path="payment" element={<PatientPayment />} />
            </Route>
            
            {/* Routes Médecin */}
            <Route path="/doctor" element={
              <RequireAuth userType="Doctor">
                <DoctorLayout />
              </RequireAuth>
            }>
              <Route index element={<DoctorDashboard />} />
              <Route path="profile" element={<DoctorProfile />} />
              <Route path="availability" element={<DoctorAvailability />} />
              <Route path="patient" element={<DoctorPatient />} />
              <Route path="notes" element={<DoctorNotes />} />
              <Route path="payment" element={<DoctorPayment />} />
            </Route>
            
            {/* Route 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
