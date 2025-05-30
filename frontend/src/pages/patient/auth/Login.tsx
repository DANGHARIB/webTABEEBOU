import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaEyeSlash, FaArrowLeft, FaUser, FaLock } from 'react-icons/fa';
import './Login.css';
import { AuthContext } from '../../../contexts/AuthContext'; // Import AuthContext

const Login = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('Login component must be used within AuthProvider');
  }
  const { login } = authContext;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError('');
    setIsLoading(true);
    
    try {
      
      // After successful login, check if we need to redirect to assessment
      // This will be handled by the AuthContext's useEffect and routing
      // We can add additional logic here if needed after login
      
      const loggedInUser = await login(email, password, 'Patient');
      console.log('Login.tsx - loggedInUser:', loggedInUser); // DEBUG LINE
      
      if (loggedInUser) {
        if (loggedInUser.hasCompletedAssessment) {
          navigate('/patient'); // Navigate to dashboard or profile
        } else {
          navigate('/patient/auth/assessment'); // Navigate to assessment page
        }
      } else {
        // setError is likely already called in login function, but good to have a fallback
        setError(authContext.error || 'Login failed. Please check your credentials.');
      }
      
    } catch (error: unknown) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || 'Invalid credentials or server error');
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Link to="/patient/auth" className="back-button">
        <FaArrowLeft />
      </Link>
      
      <div className="login-card">
        <h2>Welcome Patient!</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <div className="input-group">
              <span className="input-icon">
                <FaUser />
              </span>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-group">
            <div className="input-group">
              <span className="input-icon">
                <FaLock />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="signup-link">
          <span>Don't have an account?</span>
          <Link to="/patient/auth/register">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
