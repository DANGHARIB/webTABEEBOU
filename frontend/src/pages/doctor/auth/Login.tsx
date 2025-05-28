import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const DoctorLoginScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
        role: 'Doctor'
      });
      
      if (response.data && response.data.token) {
        localStorage.setItem('userToken', response.data.token);
        localStorage.setItem('userInfo', JSON.stringify(response.data));
        
        if (response.data.role === 'Doctor') {
          navigate('/doctor/dashboard');
        } else {
          setError('Access denied. This login is for doctors only.');
          localStorage.removeItem('userToken');
          localStorage.removeItem('userInfo');
        }
      } else {
        setError(response.data?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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
            Login
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