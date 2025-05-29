import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const DoctorLoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Clear any existing authentication on component mount to ensure fresh login
  useEffect(() => {
    // Only clear auth if we're on the login page (not after a redirect)
    if (window.location.pathname.includes('/auth/login')) {
      console.log('Login page: Clearing any existing authentication');
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('userRole');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      console.log('Authenticating with email:', email);
      
      // Real API authentication - using the correct endpoint based on backend routes
      const response = await axios.post('/api/auth/login', {
        email,
        password,
        role: 'Doctor' // Send role as part of the payload
      });
      
      // Debug the response data
      console.log('Login response:', response.data);
      
      // Extract token and user data from response
      const { token } = response.data;
      const userData = response.data.user || response.data;
      
      console.log('User data:', userData);
      console.log('User role from backend:', userData.role);
      
      // STRICT ROLE VALIDATION: Only allow doctors to proceed
      if (!userData.role || userData.role !== 'Doctor') {
        // This is not a doctor account
        setError('This login is only for doctors. Please use the patient login if you are a patient.');
        console.error('Non-doctor account attempted to use doctor login:', userData);
        
        // Do not store any auth data
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userRole');
        return;
      }
      
      // If we get here, the user is confirmed to be a doctor
      console.log('Doctor role confirmed, proceeding with login');
      
      // Store authentication data
      localStorage.setItem('token', token);
      localStorage.setItem('userInfo', JSON.stringify(userData));
      localStorage.setItem('userRole', 'Doctor');
      
      // Critical: Force a complete page refresh to /doctor/profile
      window.location.replace('/doctor/profile');
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="login-content">
        <h1 className="login-title">Welcome Doctor!</h1>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-container">
            <div className="input-icon">👤</div>
            <input
              type="email"
              className="text-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-container">
            <div className="input-icon">🔒</div>
            <input
              type={showPassword ? "text" : "password"}
              className="text-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button 
              type="button"
              className="password-toggle" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          
          <div className="signup-link" onClick={() => navigate('../signup')}>
            <span>←</span>
            <p>Don't have an account? Sign Up</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorLoginScreen;