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
import DoctorLoginScreen from './pages/doctor/auth/Login';
import DoctorSignupScreen from './pages/doctor/auth/Signup';
import DoctorDetailsScreen from './pages/doctor/auth/Details';
import DoctorAuthIndexScreen from './pages/doctor/auth/Index';
import DoctorUnderReviewScreen from './pages/doctor/auth/UnderReview';
import WelcomeDoctorScreen from './pages/doctor/auth/Welcome';

// Doctor components
import DoctorAppointment from './pages/doctor/appointments/DoctorAppointment';
import DoctorPayments from './pages/doctor/payments/DoctorPayments';
import DoctorPaymentDetails from './pages/doctor/payments/DoctorPaymentDetails';
import DoctorProfile from './pages/doctor/profile/DoctorProfile';
import DoctorSearch from './pages/doctor/search/DoctorSearch';
import DoctorProfileEdit from './pages/doctor/profile/DoctorProfileEdit';
import AvailabilityList from './pages/doctor/availability/AvailabilityList';
import CreateAvailability from './pages/doctor/availability/CreateAvailability';
import CreateNote from './pages/doctor/notes/CreateNote';
import EditNote from './pages/doctor/notes/EditNote';

// Placeholder pour les pages non encore implémentées
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="placeholder-page">
    <h2>{title}</h2>
    <p>Cette page est en cours de développement.</p>
  </div>
);

// Pages de base
import PatientProfile from './pages/patient/profile/PatientProfile';
import EditPatientProfile from './pages/patient/profile/EditPatientProfile';
import PaymentMethods from './pages/patient/profile/PaymentMethods';
import AddPaymentMethod from './pages/patient/profile/AddPaymentMethod';
import PatientDoctor from './pages/patient/doctor';
const PatientSearch = () => <PlaceholderPage title="Search" />;
const PatientAppointment = () => <PlaceholderPage title="Rendez-vous Patient" />;
const PatientPayment = () => <PlaceholderPage title="Paiements Patient" />;

const DoctorDashboard = () => <PlaceholderPage title="Tableau de bord Médecin" />;

// Pages d'authentification patient
import PatientAuthIndexScreen from './pages/patient/auth/Index';
import PatientLogin from './pages/patient/auth/Login';
// Create a placeholder for patient auth details page
const PatientAuthDetails = () => <PlaceholderPage title="Patient Details" />;
import PatientRegister from './pages/patient/auth/Register';
import PatientAdditionalDetails from './pages/patient/auth/PatientAdditionalDetails';
import VerifyOtp from './pages/patient/auth/VerifyOtp';
import AccountVerified from './pages/patient/auth/AccountVerified';
import PatientAssessment from './pages/patient/auth/PatientAssessment';

// Composant d'authentification requis pour les routes protégées

function RequireAuth({ children, userType }: { children: React.ReactNode, userType?: string }) {
  const { user, loading } = useAuth();
  
  console.log('RequireAuth checking access to:', userType);
  console.log('localStorage token:', localStorage.getItem('token'));
  console.log('localStorage userRole:', localStorage.getItem('userRole'));
  
  // SIMPLIFIED AUTHENTICATION CHECK
  // First priority: Check localStorage directly
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  
  if (token) {
    console.log('Found token in localStorage');
    
    // If this is a Doctor route and we have Doctor role in localStorage
    if (userType === 'Doctor' && role === 'Doctor') {
      console.log('✅ Access granted to Doctor route via localStorage');
      return <>{children}</>;
    }
    
    // If this is a Patient route and we have Patient role in localStorage
    if (userType === 'Patient' && role === 'Patient') {
      console.log('✅ Access granted to Patient route via localStorage');
      return <>{children}</>;
    }
    
    // Role mismatch - redirect
    if (userType) {
      console.log(`❌ Auth error: stored role (${role}) doesn't match required role (${userType})`);
      return <Navigate to="/" replace />;
    }
  }
  
  // Second priority: Check context user if localStorage didn't work
  if (!loading && user) {
    if (!userType || user.role === userType) {
      console.log('✅ Access granted via AuthContext');
      return <>{children}</>;
    } else {
      console.log(`❌ Auth error: user role (${user.role}) doesn't match required role (${userType})`);
      return <Navigate to="/" replace />;
    }
  }
  
  // Not authenticated or still loading
  console.log('❌ Access denied: not authenticated');
  return <Navigate to="/" replace />;
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
            <Route path="/patient/auth">
              <Route index element={<PatientAuthIndexScreen />} />
              <Route path="login" element={<PatientLogin />} />
              <Route path="register" element={<PatientRegister />} />
              <Route path="additional-details" element={<PatientAdditionalDetails />} />
              <Route path="verify-otp" element={<VerifyOtp />} />
              <Route path="account-verified" element={<AccountVerified />} />
              <Route path="assessment" element={<PatientAssessment />} />
              <Route path="details" element={<PatientAuthDetails />} />
            </Route>
            
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
              <Route index element={<PatientProfile />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="profile/edit" element={<EditPatientProfile />} />
              <Route path="profile/payment-methods" element={<PaymentMethods />} />
              <Route path="profile/add-payment-method" element={<AddPaymentMethod />} />
              <Route path="doctor" element={<PatientDoctor />} />
              <Route path="appointment" element={<PatientAppointment />} />
              <Route path="payment" element={<PatientPayment />} />
              <Route path="search" element={<PatientSearch />} />
            </Route>
            
            {/* Routes Médecin */}
            <Route path="/doctor" element={
              <RequireAuth userType="Doctor">
                <DoctorLayout />
              </RequireAuth>
            }>
              <Route index element={<DoctorDashboard />} />
              <Route path="profile" element={<DoctorProfile />} />
              <Route path="profile/edit" element={<DoctorProfileEdit />} />
              <Route path="availability" element={<AvailabilityList />} />
              <Route path="availability/create" element={<CreateAvailability />} />
              <Route path="search" element={<DoctorSearch />} />
              <Route path="notes">
                <Route index element={<DoctorPayments />} /> {/* Placeholder until we have a notes index page */}
                <Route path="create" element={<CreateNote />} />
                <Route path=":id" element={<EditNote />} />
              </Route>
              <Route path="payments" element={<DoctorPayments />} />
              <Route path="payments/:paymentId" element={<DoctorPaymentDetails />} />
              <Route path="appointment" element={<DoctorAppointment />} />
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
