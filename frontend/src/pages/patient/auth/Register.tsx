import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import './Register.css'; // We'll create this next

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const RegisterScreen: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prevState => ({
      ...prevState,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        fullName: `${formData.firstName} ${formData.lastName}`, // Concatenate for now
        email: formData.email,
        password: formData.password,
        role: 'Patient'
      });
      
      if (response.data) {
        // Navigate to the new additional details page, passing necessary info
        navigate(`/patient/auth/additional-details?email=${encodeURIComponent(formData.email)}&firstName=${encodeURIComponent(formData.firstName)}&lastName=${encodeURIComponent(formData.lastName)}`);
      }
    } catch (err) {
      let errorMessage = 'Registration failed. Please try again.';
      if (axios.isAxiosError(err)) {
        console.error('Registration error:', err.message);
        if (err.response) {
          console.error('Error details:', err.response.data);
          errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err instanceof Error) {
        console.error('Registration error:', err.message);
        errorMessage = err.message;
      } else {
        console.error('An unexpected error occurred:', err);
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container login-container">
      <Link to="/patient/auth" className="back-button">
        <FaArrowLeft />
      </Link>
      
      <div className="register-card login-card">
        <h2>Create your account</h2>
        <p className="subtitle">
          Fill in the data for your profile. It will take a couple of minutes.
        </p>

        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <div className="input-group">
              <span className="input-icon"><FaUser /></span>
              <input
                type="text"
                id="firstName"
                name="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <div className="input-group">
              <span className="input-icon"><FaUser /></span>
              <input
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-group">
              <span className="input-icon"><FaUser /></span> {/* Consider a different icon for email, e.g., FaEnvelope */}
              <input
                type="email"
                id="email"
                name="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-group">
              <span className="input-icon"><FaLock /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-group">
              <span className="input-icon"><FaLock /></span>
              <input
                type={showPassword ? 'text' : 'password'} // Should this also toggle with showPassword?
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="register-button login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'CREATE ACCOUNT'}
          </button>
        </form>
        
        <div className="login-redirect-link signup-link">
          <FaArrowLeft size={14}/> 
          <span>Already have an account? </span>
          <Link to="/patient/auth/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
